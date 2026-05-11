"use client"

import * as React from "react"

const CollapsibleContext = React.createContext({
  open: false,
  onOpenChange: () => {}
})

const Collapsible = React.forwardRef(({ open, onOpenChange, children, ...props }, ref) => {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      <div ref={ref} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
})
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  const { onOpenChange } = React.useContext(CollapsibleContext)
  
  const handleClick = () => {
    onOpenChange?.()
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      onClick: handleClick,
      ...props
    })
  }

  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef(({ children, ...props }, ref) => {
  const { open } = React.useContext(CollapsibleContext)
  
  if (!open) {
    return null
  }

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }