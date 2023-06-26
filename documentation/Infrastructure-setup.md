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
**Important: we need to extract the database password to save for later because it will be generated only at this time**

`terraform apply plan.out`

When complete terraform should report a successful deployment. We can setup kubectl to connect to our cluster by running:

`aws eks --region us-east-1 update-kubeconfig --name vsm-eks` where `vsm-eks` is the name of the cluster.

We can now deploy our applications to the cluster. First we need to create a namespace for our applications to run in:

`kubectl create namespace vsm`

Next we need to create a secret for our database password:

`kubectl create secret generic vsm-db-password --from-literal=password=<password> -n vsm`

Where `<password>` is the password we extracted from terraform.


## Application Deployment

Now we have our DB setup we can deploy our applications. First we need to build our vsm-app docker images and push them to ECR.
Afterwards we need to update our yaml files in `infrastructure/kubernetes` to use the new image directory.

Now we can deploy our applications:
`kubectl apply -f <app_root_directory>/infrastructure/kubernetes -n vsm`

This will deploy all of our applications to the cluster. We can check the status of our pods by running:

`kubectl get pods -n vsm`


## Future refinements

For our deployments we didn't setup persistence for our user auth but it would be setup similarly in terms of the infrastructure to RDS for the cqf-ruler.

## Troubleshooting:

If you cannot access the cluster, you may need to update the aws-auth configmap. To do this, run the following command and adding your arn to the configmap:

`kube -n kube-system configmap/aws-auth`

resource: https://www.agilepartner.net/en/adding-users-to-your-eks-cluster/

