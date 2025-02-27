#!/bin/bash
#DO NOT EDIT WITH WINDOWS
tooling_jar=input-cache/tooling-cli-3.6.0.jar
path_to_spreadsheet="./RCKMS Condition Codes.20240628.xlsx"
output_path=./output

tooling=$tooling_jar

echo $tooling

if test -f "$tooling"; then	
	JAVA -jar $tooling -XlsxToValueSet -pts="$path_to_spreadsheet" -op="$output_path" -e=json -code="1:1:2" -display="1:1:3" -system="1:1:4" -synonymdesignation="1:1:0" -codeversion="1:1:5"
else
	echo Tooling jar NOT FOUND.  Please run _updateCQFTooling.  Aborting...
fi

mv "${output_path}/valueset.json" "${output_path}/valueset-rckms-condition-codes.json"