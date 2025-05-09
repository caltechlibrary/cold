
COLD has a report request service with a web user interface.  To generate a report a report runner service is needed.

Once the report request is made a record is created in the reports.ds collection. The report runner is expected to check that collection and run requested reports keeping the records updated as the report running processes proceeds. The final step is to either return an error message of why the request failed or return the status of "available" with a link to where the report can be viewed or downloaded.

The system is deliberately simple. This is to keep it maintainable, easy for everyone to understand (developers and the people who request reports). Most importantly it needs to be easy to maintain. Report systems tend towards complexity so it is vital that the initial system be as simple as possible but still accomodate both quick reports and those which may take hours to complete.


The report request process is integrated into the COLD UI. That UI lists the requests and includes a form to making a new request. When the report runner picks up a request several things need to happen.

- report status should show that the report request is being processed
- the report request needs to be validated and if their is s problem an error returned and the request processed close

If the request is valid then several things need to happen.

- the report definition needs to be retrieved (probably from memory)
- the designated script/program needs to be run
- the output of the script/program (stdout) needs to be read and streamed into a report document at the location specified by the report definition
- as the report executes output should be written to the web tree (e.g. htdocs/reports) and a link generated
- if their is a problem the report process should terminal and the request updated with the status of error and message
- if the report executes successfully the request record should be updated wiht the status of "available" and the link
- if there are email(s) associated with the request a message needs to be sent out with the report name, final status and link if available or error message if not

Reports are programs or scripts (e.g. Bash, Python) that write their results to standard output, the runner reads that and takes care of saving the results and contacting the email addresses.

I've prototyped the report runner in TypeScript but am not happy with it. I am deciding if I should write this in Go or give Python a try.

I'm thinking reports could be simple script written in any langauge that write their output to standard out. The runner should be responsible for taking that output and writing it to an appropriate place (e.g. Google Drive).

Originally I was thinking that this should be the responsibility of the report script/program but given the level of complexity dealing with G-Drive I think the runner should be responsible for the final place the report resides.

My current view is a report request would look something like this.

```
{
    "id": "6fec5fbf-5368-5d11-95c7-e2534752e3a5",
    "report_name": "generate_people_csv",
    "email": "rsdoiel@caltech.edu,tmorrell@caltech.edu",
    "requested": "2024-10-25T19:37:44.169Z",
    "status": "requested",
    "link": "",
    "updated": "2024-10-25T19:37:44.169Z"
}
```

The report definition should look more like this.

```
{
    "report_name": "generate_people_csv",
    "cmd": "./rpt_people_csv.bash",
    "write_url": "s3://feeds.library.caltech.edu/people",
    "link_url": "https://feeds.library.caltech.edu/people",
    "basename": "people.csv",
    "content_type": "text/csv",
    "append_timestamp": false,
    "options": []
}
```

The runner would check the report requests, take the requested information and validated it against the predefined reports.  It would run the report capturing the output then write it to "write_base" appending the basename, optional timestamp and an file extension associated with the mime type (e.g ".csv" for a "text/csv"). I'm thinking aboutsupporting two storage protocols. They would be "file://", "s3://".

I considered writing directory to G-Drive since their is a practice of doing that manually.  Google Drive API is problematic.  Google changes API pretty frequently. Any time they make a change I will likely need to update or modify my code. Given my experience with the Google Sheet's API I feel this is an unnecessary burden. In princple it maybe possible to mount Google Drive as a FUSE file system but even that looks pretty tedious to maintain over the long run.

The NAS can be mounted easily to our data processing system. The staff requesting reports has access to that. For static websites like feeds, the S3 protocol is sufficient to easily distributed public oriented reports (e.g. people.csv, gorups.csv).

The problem is the NAS might be mounted in different ways on each person's computer. So a "file:///" link isn't viable. While writing to "file//datawork.library.caltech.edu/Sites/feeds_v1.6/htdocs/people/people.csv" makes sense to the software it doen't result in a clickable link for our end user. While writing to an S3 bucket can have a direct mapping to a URLs the NAS doesn't fit that situation.

Example "file://datawork.library.caltech.edu/Sites/feeds_v1.6/htdocs/people/people.csv" while eventually it'll get to "https://feeds.library.caltech.edu/people/people.csv" that isn't helpful when an end user wants a current, clickable link to see the report right at the point of creation.


I've written a prototype in TypeScript compiled with Deno.   Creating webservices that take advantage of concurrency is more convoluted in TypeScript (e.g. need to use service workers) than Go.  The report runner server should run as a systemd service. It is easy to implement a sequencial report runner in TypeScript but since reports can sometimes take hours to complete this isn't ideal. Taking advantage of concurrency in TypeScript means using service works. Given that case it makes more sense in writing the report runner in Go and taking advantage of Go's maturity in concurrency and as a service platform.

## Current implementation

- cold_reports runs a service monitoring the contents of reports.ds collection
- the reports that are authorized to run are defined in cold_reports.yaml
- the program that runs the report are currently Bash wrapping runable programs like,
  - `bin/group_vocabulary`
  - `bin/journal_vocabulary`
- the Reports web UI is defined in the template, `views/report_list.hbs`
  - if adding a new report you need to update the template
  - define the new report in cold_reports.yaml
  - the cold_reports service needs to be restarted
