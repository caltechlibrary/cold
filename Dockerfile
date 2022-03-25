# syntax=docker/dockerfile:1
FROM ubuntu:20.04
RUN apt update
RUN apt upgrade
# I need to include everything necessary to run make before running cold.
RUN apt install build-essential golang pandoc
COPY . /app
WORKDIR /app
RUN make
CMD [ "./bin/cold" ]
