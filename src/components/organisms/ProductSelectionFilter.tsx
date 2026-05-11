'use client';

import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Filter, 
  Package, 
  Pill, 
  Users, 
  CheckCircle, 
  XCircle,
  Download,
  Info,
  Search
} from 'lucide-react';
import { 
  OpenFdaResult, 
  fetchSplDetailFromDailyMed,
  selectFdaDataState 
} from '@/lib/store/slices/fdaDataSlice';

interface ProductSelectionFilterProps {
  openFdaResults: OpenFdaResult[];
  onProductsSelected?: (selectedProducts: OpenFdaResult[]) => void;
}

interface ProductAnalysis {
  isCombination: boolean;
  ingredientCount: number;
  activeIngredients: string[];
  dosageForms: string[];
  manufacturers: string[];
  applicationNumbers: string[];
  splSetIds: string[];
}

export function ProductSelectionFilter({ 
  openFdaResults, 
  onProductsSelected 
}: ProductSelectionFilterProps) {
  const dispatch = useDispatch<AppDispatch>();
  const fdaData = useSelector(selectFdaDataState);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'single' | 'combination'>('all');
  const [genericNameFilter, setGenericNameFilter] = useState<string>('');
  const [groupByGeneric, setGroupByGeneric] = useState<boolean>(true);

  // Analyze each product to determine if it's a combination
  const analyzedProducts = useMemo(() => {
    return openFdaResults.map((result, index) => {
      const analysis: ProductAnalysis = {
        isCombination: false,
        ingredientCount: 0,
        activeIngredients: [],
        dosageForms: [],
        manufacturers: [],
        applicationNumbers: [],
        splSetIds: []
      };

      // Extract active ingredients
      if (result.openfda?.substance_name) {
        analysis.activeIngredients = result.openfda.substance_name;
        analysis.ingredientCount = result.openfda.substance_name.length;
        analysis.isCombination = analysis.ingredientCount > 1;
      } else if (result.active_ingredients) {
        analysis.activeIngredients = result.active_ingredients.map(ing => ing.name);
        analysis.ingredientCount = result.active_ingredients.length;
        analysis.isCombination = analysis.ingredientCount > 1;
      } else {
        // Fallback: try to detect from generic/brand names
        const genericName = result.openfda?.generic_name?.[0] || result.generic_name || '';
        const brandName = result.openfda?.brand_name?.[0] || result.brand_name || '';
        
        // Simple heuristic: look for common combination indicators
        const combinationIndicators = [
          ' and ', ' / ', ' with ', ' + ', ';', ',',
          'hydrochlorothiazide', 'hctz', 'aspirin', 'caffeine'
        ];
        
        const nameToCheck = `${genericName} ${brandName}`.toLowerCase();
        analysis.isCombination = combinationIndicators.some(indicator => 
          nameToCheck.includes(indicator)
        );
        
        analysis.activeIngredients = [genericName || brandName || 'Unknown'];
        analysis.ingredientCount = analysis.isCombination ? 2 : 1;
      }

      // Extract other metadata
      if (result.openfda?.manufacturer_name) {
        analysis.manufacturers = result.openfda.manufacturer_name;
      }
      
      if (result.application_number) {
        analysis.applicationNumbers = [result.application_number];
      }
      
      if (result.openfda?.spl_set_id) {
        analysis.splSetIds = result.openfda.spl_set_id;
      } else if (result.set_id) {
        analysis.splSetIds = [result.set_id];
      }

      return {
        result,
        analysis,
        id: `product-${index}`,
        displayName: result.openfda?.brand_name?.[0] || result.brand_name || 'Unknown Product',
        genericName: result.openfda?.generic_name?.[0] || result.generic_name || 'Unknown',
        // Extract base generic name (e.g., "INSULIN" from "INSULIN LISPRO")
        baseGenericName: (result.openfda?.generic_name?.[0] || result.generic_name || '')
          .split(' ')[0]
          .toUpperCase()
      };
    });
  }, [openFdaResults]);

  // Filter products based on type and generic name
  const filteredProducts = useMemo(() => {
    let products = analyzedProducts;
    
    // Filter by type
    switch (filterType) {
      case 'single':
        products = products.filter(p => !p.analysis.isCombination);
        break;
      case 'combination':
        products = products.filter(p => p.analysis.isCombination);
        break;
    }
    
    // Filter by generic name
    if (genericNameFilter.trim()) {
      const searchTerm = genericNameFilter.toLowerCase().trim();
      products = products.filter(p => 
        p.genericName.toLowerCase().includes(searchTerm) ||
        p.baseGenericName.toLowerCase().includes(searchTerm) ||
        p.analysis.activeIngredients.some(ing => 
          ing.toLowerCase().includes(searchTerm)
        )
      );
    }
    
    return products;
  }, [analyzedProducts, filterType, genericNameFilter]);

  // Group products by generic name if enabled
  const groupedProducts = useMemo(() => {
    if (!groupByGeneric) {
      return { 'All Products': filteredProducts };
    }
    
    const groups: Record<string, typeof filteredProducts> = {};
    
    filteredProducts.forEach(product => {
      const groupName = product.genericName || 'Unknown';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(product);
    });
    
    // Sort groups by name
    const sortedGroups: Record<string, typeof filteredProducts> = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  }, [filteredProducts, groupByGeneric]);

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
  };

  const handleClearAll = () => {
    setSelectedProducts(new Set());
  };
  
  const handleSelectGroup = (groupName: string) => {
    const groupProducts = groupedProducts[groupName] || [];
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      groupProducts.forEach(p => newSet.add(p.id));
      return newSet;
    });
  };
  
  const handleDeselectGroup = (groupName: string) => {
    const groupProducts = groupedProducts[groupName] || [];
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      groupProducts.forEach(p => newSet.delete(p.id));
      return newSet;
    });
  };

  const handleFetchSelectedSPLs = () => {
    const selectedProductData = filteredProducts
      .filter(p => selectedProducts.has(p.id))
      .map(p => p.result);

    // Fetch SPL details for all selected products
    const allSplSetIds = new Set<string>();
    selectedProductData.forEach(product => {
      if (product.openfda?.spl_set_id) {
        product.openfda.spl_set_id.forEach(setId => allSplSetIds.add(setId));
      } else if (product.set_id) {
        allSplSetIds.add(product.set_id);
      }
    });

    // Dispatch fetch for each unique SPL set ID
    Array.from(allSplSetIds).forEach(setId => {
      if (!fdaData.dailyMedDetails[setId] || fdaData.dailyMedDetails[setId].status === 'idle') {
        dispatch(fetchSplDetailFromDailyMed(setId));
      }
    });

    // Notify parent component
    if (onProductsSelected) {
      onProductsSelected(selectedProductData);
    }
  };

  const singleProducts = analyzedProducts.filter(p => !p.analysis.isCombination);
  const combinationProducts = analyzedProducts.filter(p => p.analysis.isCombination);
  const selectedCount = selectedProducts.size;
  const totalSplCount = filteredProducts
    .filter(p => selectedProducts.has(p.id))
    .reduce((sum, p) => sum + p.analysis.splSetIds.length, 0);

  // Get unique generic names for display
  const uniqueGenericNames = useMemo(() => {
    const names = new Set<string>();
    analyzedProducts.forEach(p => {
      if (p.genericName && p.genericName !== 'Unknown') {
        names.add(p.genericName);
      }
    });
    return Array.from(names).sort();
  }, [analyzedProducts]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Product Selection Filter
            </CardTitle>
            <CardDescription>
              Choose specific products to analyze before fetching clinical data. 
              This helps focus on exactly what you need.
            </CardDescription>
          </div>
          <div className="text-sm text-gray-600">
            {openFdaResults.length} products found
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Generic Name Filter */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Filter by generic name (e.g., 'insulin' to see all insulin types)"
                value={genericNameFilter}
                onChange={(e) => setGenericNameFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupByGeneric(!groupByGeneric)}
              className={groupByGeneric ? 'bg-blue-50' : ''}
            >
              {groupByGeneric ? 'Grouped' : 'Ungrouped'}
            </Button>
          </div>
          
          {/* Quick selection for unique generic names if multiple found */}
          {uniqueGenericNames.length > 1 && !genericNameFilter && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-500">Quick filter:</span>
              {uniqueGenericNames.slice(0, 5).map(name => (
                <Badge
                  key={name}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-gray-100"
                  onClick={() => setGenericNameFilter(name)}
                >
                  {name}
                </Badge>
              ))}
              {uniqueGenericNames.length > 5 && (
                <span className="text-xs text-gray-500">+{uniqueGenericNames.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Package className="w-6 h-6 mx-auto text-blue-600 mb-1" />
            <div className="text-lg font-semibold text-blue-900">{singleProducts.length}</div>
            <div className="text-xs text-blue-700">Single Ingredient</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <Users className="w-6 h-6 mx-auto text-orange-600 mb-1" />
            <div className="text-lg font-semibold text-orange-900">{combinationProducts.length}</div>
            <div className="text-xs text-orange-700">Combination</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-1" />
            <div className="text-lg font-semibold text-green-900">{selectedCount}</div>
            <div className="text-xs text-green-700">Selected</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <Download className="w-6 h-6 mx-auto text-purple-600 mb-1" />
            <div className="text-lg font-semibold text-purple-900">{totalSplCount}</div>
            <div className="text-xs text-purple-700">SPLs to Fetch</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filterType} onValueChange={(value: string) => setFilterType(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-sm">All Products ({analyzedProducts.length})</TabsTrigger>
            <TabsTrigger value="single" className="text-sm">Single Ingredient ({singleProducts.length})</TabsTrigger>
            <TabsTrigger value="combination" className="text-sm">Combinations ({combinationProducts.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value={filterType} className="space-y-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-sm">
                  Select All ({filteredProducts.length})
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearAll} className="text-sm">
                  Clear All
                </Button>
              </div>
              <Button 
                onClick={handleFetchSelectedSPLs}
                disabled={selectedCount === 0}
                className="flex items-center gap-2"
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4" />
                Fetch SPLs for Selected ({selectedCount})
              </Button>
            </div>

            {/* Product List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <XCircle className="w-8 h-8 mx-auto mb-2" />
                  No products match the current filter
                </div>
              ) : (
                Object.entries(groupedProducts).map(([groupName, products]) => (
                  <div key={groupName} className="space-y-2">
                    {groupByGeneric && (
                      <div className="sticky top-0 bg-white z-10 py-1">
                        <div className="flex items-center justify-between px-2 py-1 bg-gray-100 rounded">
                          <h3 className="text-sm font-semibold text-gray-700">
                            {groupName} ({products.length})
                          </h3>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => handleSelectGroup(groupName)}
                            >
                              Select All
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => handleDeselectGroup(groupName)}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    {products.map((productInfo) => (
                      <ProductCard
                        key={productInfo.id}
                        productInfo={productInfo}
                        isSelected={selectedProducts.has(productInfo.id)}
                        onToggle={() => handleProductToggle(productInfo.id)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface ProductCardProps {
  productInfo: {
    result: OpenFdaResult;
    analysis: ProductAnalysis;
    id: string;
    displayName: string;
    genericName: string;
    baseGenericName: string;
  };
  isSelected: boolean;
  onToggle: () => void;
}

function ProductCard({ productInfo, isSelected, onToggle }: ProductCardProps) {
  const { result, analysis, displayName } = productInfo;
  
  const genericName = result.openfda?.generic_name?.[0] || result.generic_name || 'Unknown';
  const manufacturer = result.openfda?.manufacturer_name?.[0] || 'Unknown Manufacturer';
  const applicationNumber = result.application_number || 'N/A';

  return (
    <div 
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Checkbox checked={isSelected} className="mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 truncate">{displayName}</h4>
              <Badge variant={analysis.isCombination ? "secondary" : "default"}>
                {analysis.isCombination ? 'COMBINATION' : 'SINGLE'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Generic: {genericName}</p>
            <p className="text-xs text-gray-500">Manufacturer: {manufacturer}</p>
            {applicationNumber !== 'N/A' && (
              <p className="text-xs text-gray-500">Application: {applicationNumber}</p>
            )}
            
            {/* Active Ingredients */}
            {analysis.activeIngredients.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Active Ingredients ({analysis.ingredientCount}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.activeIngredients.slice(0, 3).map((ingredient, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {ingredient}
                    </Badge>
                  ))}
                  {analysis.activeIngredients.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{analysis.activeIngredients.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            {analysis.splSetIds.length} SPL{analysis.splSetIds.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}