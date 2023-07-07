## Overview
Our applications are setup on AWS Elastic Kubernetes Service (EKS) and utilizes the following additional services:
- AWS Elastic Container Registry: Stores the docker images of our ValueSet Manager appication (vsm-app).
- EC2: Load Balancers and instances will be spun up from the EKS cluster to support the applications running in the orchestrator.
- RDS Postgres: Stores the data for our cqf-ruler application.
- AWS Elastic Cache: Can be used as a cache for our vsm-app but serves as a worker for our background jobs.
- Key Management Service: Used to encrypt various secrets and keys.
## AWS Infrastructure Deployment

On EKS we run three services, cqf-ruler, vsm-app, and keycloak with one pod replication each. To deploy all the standing 
infrastructure we first use terraform.

`terraform init`

`terraform plan -out plan.out`

`terraform apply plan.out`

When complete terraform should report a successful deployment. We can setup our local command line to connect to our cluster by running:

`aws eks --region us-east-1 update-kubeconfig --name vsm-eks` where `vsm-eks` is the name of the cluster.

We can now deploy our applications to the cluster. First we need to create a namespace for our applications to run in:

`kubectl create namespace vsm`

## Application Deployment

prequisites:
  - helm (https://helm.sh/docs/intro/install/#from-script)
  - yq (https://mikefarah.gitbook.io/yq/) & jq (https://stedolan.github.io/jq/)
  - ecr setup (https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html)

Application will first require a deployment so that AWS can allocate load balancers to the services. Thereafter we will redeployment with those load balancer urls.

Build vsm-app docker images and push them to ECR, refer to `./bin/deploy` at the `# Build and push image to ECR` step to see how to do this.

Afterwards we need to update our yaml files in `infrastructure/kubernetes/templates` to use the new image directory.

Now we can deploy our applications using helm:
`helm install "vsm-app" --namespace=vsm --set tag=<the tag vsm-app ecr image was given> infrastructure/kubernetes`

This will deploy all of our applications to the cluster. We can check the status of our pods by running:

`kubectl get pods -n vsm`

Afterwards we will need to setup our load balancers. To do this we need to run the following commands:

 `./bin/update_helm_config.js` to make things easier.

To update our deployment with the load balancer urls we need to run the following commands:
`helm upgrade "vsm-app" --namespace=vsm infrastructure/kubernetes`
## Future refinements

For our deployments we didn't setup persistence for our user auth but it would be setup similarly in terms of the infrastructure to RDS for the cqf-ruler.

## Troubleshooting:

- If you cannot access the cluster, you may need to update the aws-auth configmap. To do this, run the following command and adding your arn to the configmap:

`kube -n kube-system configmap/aws-auth`

resource: https://www.agilepartner.net/en/adding-users-to-your-eks-cluster/

- If you have trouble running the scripts make sure `yq` and `jq` are installed and available in your path.****