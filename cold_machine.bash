#!/bin/bash

#
# This script generates a "Newt Machine" using Multipass.
#
echo "Launch cold_machine"
multipass launch \
	--name cold_machine \
	--memory 4G \
	--disk 150G \
	--cpus 2 \
	--cloud-init cold_machine.yaml
multipass info cold_machine
NEWT_IP_ADDRESS=$(multipass list | grep cold_machine | cut -c 43-58)
cat <<EOT

  Weclome to the Cold Machine. You can
  access if with 

      multipass shell cold_machine

  You can grant yourself SSH access with the following
  command when you connect using multipass shell.

     ssh-keygen
	 curl -L -o - https://github.com/${USER}.keys \
	              >>.ssh/authorized_keys

  This is handy so you can setup port forward for local
  services like.

     ssh -L 8011:localhost:8011 ubuntu@${NEW_IP_ADDRESS}
EOT
