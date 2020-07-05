#!/usr/bin/env bash

SSL=~/.secrez-courier/ssl

help() {
  echo "
ERROR: Invalid option.

Accepted options:
    -d [destination directory] (by default it is '~/.secrez-courier/ssl')
Example:
    bin/generate-certificate.sh -r `pwd`/secrez-courier
"
}

while getopts "d:" opt; do
  case $opt in
  d)
    SSL=$OPTARG
    ;;
  \?)
    help
    exit 1
    ;;
  esac
done

if [[ ! -d $SSL ]]; then
  mkdir $SSL
fi

cd $SSL
rm *

echo "authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment" >domains

openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:2048 -keyout ca.key -out ca.pem -subj "/C=US/CN=Example-Root-CA"

openssl x509 -outform pem -in ca.pem -out ca.crt

openssl req -new -nodes -newkey rsa:2048 -keyout localhost.key -out localhost.csr -subj "/C=US/ST=YourState/L=YourCity/O=Example-Certificates/CN=localhost"

openssl x509 -req -sha256 -days 1024 -in localhost.csr -CA ca.pem -CAkey ca.key -CAcreateserial -extfile domains -out localhost.crt
