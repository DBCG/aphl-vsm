#!/bin/bash
#DO NOT EDIT WITH WINDOWS
tooling_jar=$PWD/tooling-1.4.1-SNAPSHOT-jar-with-dependencies.jar
path_to_bundle=$PWD/inputbundle/bundle.json
output_path=$PWD/output
path_to_plandefinition=$PWD/plandefinition/plandefinition-us-ecr-specification.json

ECHO $output_path
JAVA -jar $tooling_jar -TransformErsd -ptb="$path_to_bundle" -op="$output_path" -ptpd="$path_to_plandefinition" -e="json" -e="xml"
