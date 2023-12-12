# Plugin

This is a cqf-ruler plugin which takes an eRSD V2 Bundle and converts it to an eRSD V1 Bundle.

## Build

Use `mvn package` to build the jar files

## Docker

The Dockerfile builds on top of the base cqf-ruler image and simply copies the jar into the `plugin` directory of the image.

## Setup

If a V1 PlanDefinition is not provided as a parameter the PlanDefinition that was in the source Bundle will be preserved.
