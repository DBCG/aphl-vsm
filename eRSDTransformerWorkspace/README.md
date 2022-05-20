For more information on the eRSD Transformer, view the [ReadMe](https://github.com/cqframework/cqf-tooling/master/src/test/resources/org/opencds/cqf/tooling/casereporting/README.md).
This 'eRSDTransformer' directory is just a package to make running the eRSD Transformer more convenient. A script (_updateCQFTooling.sh|bat) is included for downloading the CQF Tooling jar. The v2 PlanDefinition is also included in the /plandefinition directory. The transformer will replace the PlanDefinition in the input bundle with the PlanDefinition contained here.

To transform an eRSD v1 bundle to v2:

1. Run the _updateCQFTooling script to download the tooling jar. It should download to this directory.
2. Paste the eRSD v1 bundle into the 'inputbundle' directory and make sure the file is named 'bundle.json' (alternatively, you can modify the file name in the 'path_to_bundle' variable in the _transform script to be the name of the file).
3. Run either of the _transform script files.
4. The resulting eRSD v2 file should be written to the 'output' directory.
5. The _transform script is currently written so that both xml and json versions of the eRSD v2 are produced.
