#!/bin/bash
# Simple notification script for WSL2

# Function to play sound
notify_done() {
    # Play a beep sound using PowerShell
    powershell.exe -c "[console]::beep(800,300); [console]::beep(1000,300)"
    
    # Optional: Show Windows notification
    powershell.exe -c "
        Add-Type -AssemblyName System.Windows.Forms
        \$notification = New-Object System.Windows.Forms.NotifyIcon
        \$notification.Icon = [System.Drawing.SystemIcons]::Information
        \$notification.Visible = \$true
        \$notification.ShowBalloonTip(5000, 'Claude Code', 'Task completed!', [System.Windows.Forms.ToolTipIcon]::Info)
    " 2>/dev/null || true
    
    # Optional: Speak the message
    if [ "$1" ]; then
        powershell.exe -c "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('$1')"
    else
        powershell.exe -c "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('Task completed')"
    fi
}

# Run the notification
notify_done "$@"