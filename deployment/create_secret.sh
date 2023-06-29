#!/bin/bash

kubectl delete secret grafana-config
kubectl create secret generic grafana-config --from-file=grafana.ini

# same command as above with dry run
# kubectl create secret generic grafana-config --from-file=grafana.ini --dry-run=client -o yaml

