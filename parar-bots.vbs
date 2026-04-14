Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "taskkill /F /IM node.exe", 0, True
MsgBox "Os bots foram desligados.", 64, "Bot de Promoções"
