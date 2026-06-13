; When the old uninstaller cannot be found (e.g. registry points to a path that no longer
; exists after a manual file deletion or a path change), electron-builder's NSIS would show
; "Failed to uninstall the previous application" and abort. Defining these macros tells the
; installer to skip that error and proceed — the new installer will overwrite the old files
; regardless, so the end result is the same as a clean uninstall + reinstall.
!macro customUnInstallCheck
  ClearErrors
!macroend

!macro customUnInstallCheckCurrentUser
  ClearErrors
!macroend
