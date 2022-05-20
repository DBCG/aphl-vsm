@ECHO ON

SET "dlurl=https://oss.sonatype.org/service/local/artifact/maven/redirect?r=snapshots&g=org.opencds.cqf&a=tooling&v=1.4.1-SNAPSHOT&c=jar-with-dependencies"
SET tooling_jar=tooling-1.4.1-SNAPSHOT-jar-with-dependencies.jar
SET jarlocation=%~dp0%tooling_jar%
ECHO jar location == %jarlocation%
ECHO Downloading most recent CQF Tooling jar - it's ~110 MB, so this may take a bit

FOR /f "tokens=4-5 delims=. " %%i IN ('ver') DO SET VERSION=%%i.%%j
IF "%version%" == "10.0" GOTO win10
IF "%version%" == "6.3" GOTO win8.1
IF "%version%" == "6.2" GOTO win8
IF "%version%" == "6.1" GOTO win7
IF "%version%" == "6.0" GOTO vista

ECHO Unrecognized version: %version%
GOTO done

:win10
POWERSHELL -command "if ('System.Net.WebClient' -as [type]) {(new-object System.Net.WebClient).DownloadFile('%dlurl%','%jarlocation%') } else { Invoke-WebRequest -Uri '%dlurl%' -Outfile '%jarlocation%' }"
ECHO Download complete.
GOTO done

:win7
bitsadmin /transfer GetRefresh /download /priority normal "%dlurl%" "%jarlocation%"
ECHO Download complete.
GOTO done

:win8.1
:win8
:vista
ECHO This script does not yet support Windows %winver%.  Please ask for help on https://chat.fhir.org/#narrow/stream/179207-connectathon-mgmt/topic/Clinical.20Reasoning.20Track
GOTO done

:done
PAUSE
