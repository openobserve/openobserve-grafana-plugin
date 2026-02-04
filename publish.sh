#!/bin/bash

npm run build
mv dist zo_gp
zip -r zo_gp.zip ./zo_gp/

aws s3 cp zo_gp.zip s3://zincsearch-releases/zo_gp/zo_gp.zip

rm -rf zo_gp.zip zo_gp

