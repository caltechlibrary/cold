@echo off
REM
REM This script generates a "COLD Machine" using Multipass.
REM
echo Launching cold_machine
multipass launch --name cold_machine --memory 4G --disk 150G --cpus 2 --cloud-init cold_machine.yaml
multipass info cold_machine
@echo on
