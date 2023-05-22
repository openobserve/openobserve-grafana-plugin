#!/bin/bash

npm run build
mv dist zo_gp
tar -czvf zo_gp.tar.gz ./zo_gp/

aws s3 cp zo_gp.tar.gz s3://zincsearch-releases/zo_gp/zo_gp.tar.gz

rm -rf zo_gp.tar.gz zo_gp

