; Mata qualquer instância rodando antes de tentar desinstalar a versão anterior.
; Sem isso, o desinstalador falha com arquivos travados e o instalador aborta.
!macro customInit
  nsExec::ExecToStack 'taskkill /F /IM "Hábitos.exe"'
  ClearErrors
!macroend

; Se o desinstalador anterior não for encontrado (ex: pasta deletada manualmente,
; caminho mudou), limpa o erro e deixa a instalação continuar.
!macro customUnInstallCheck
  ClearErrors
!macroend

!macro customUnInstallCheckCurrentUser
  ClearErrors
!macroend
