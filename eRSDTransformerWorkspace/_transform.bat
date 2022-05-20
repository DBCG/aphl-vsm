@ECHO OFF
SET tooling_jar=%~dp0/tooling-1.4.1-SNAPSHOT-jar-with-dependencies.jar
SET path_to_bundle=%~dp0/inputbundle/bundle.xml
SET output_path=%~dp0/adam
SET path_to_plandefinition=%~dp0/plandefinition/plandefinition-us-ecr-specification.json

JAVA -jar "%tooling_jar%" -TransformErsd -ptb="%path_to_bundle%" -op="%output_path%" -ptpd="%path_to_plandefinition%" -e="json" -e="xml"

PAUSE
