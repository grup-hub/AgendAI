$javaHome = 'C:\Program Files\Android\Android Studio\jbr'
$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"
Set-Location 'D:\TRABALHO\Sistema_Agendai\agendai\mobile\android'
.\gradlew assembleRelease
