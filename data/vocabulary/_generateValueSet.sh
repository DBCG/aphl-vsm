#!/bin/bash
#DO NOT EDIT WITH WINDOWS
tooling_jar=tooling-cli-2.5.0-SNAPSHOT.jar
path_to_spreadsheet="./RCKMS Condition Codes.20230614.xlsx"
output_path=./output
# output_file_name=eRSDv2_specification_bundle

tooling=$tooling_jar

echo $tooling

if test -f "$tooling"; then	
	# JAVA -jar $tooling -TransformErsd -ptb="$path_to_spreadsheet" -op="$output_path" -ptpd="$path_to_plandefinition" -ofn="$output_file_name" -e=json 
	# JAVA -jar $tooling -TransformErsd -ptb="$path_to_input_bundle" -op="$output_path" -ptpd="$path_to_plandefinition" -ofn="$output_file_name" -e=xml -ppo=true
	JAVA -jar $tooling -XlsxToValueSet -pts="$path_to_spreadsheet" -op="$output_path" -e=json -code="1:1:2" -display="1:1:3" -system="1:1:4" -synonymdesignation="1:1:0" -codeversion="1:1:5"
else
	echo Tooling jar NOT FOUND.  Please run _updateCQFTooling.  Aborting...
fi