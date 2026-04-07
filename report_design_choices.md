
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

## Requested updates for parameterized reports, April 2026

Integrating the collaborator reports requires the reports system to support parameterized reports. What does the reports system need to do to safely hand off paremeters to processes that might be privileged (example a report that is implemented as a Bash script running via the web user). You need to define the parameters in the reports system configuration for the SQL query along with a means of validating the input.

### Validation approaches

A good first step would be to build-in support to validate the inputs defined as HTML5 input elements and textarea. This would be the most basic approach. It would be a nice to have the option of a custom validation method too though that will raise the complexity.  The web service provided by dataset has a feature issue for something like this. Right now it needs to be handle at the middleware level (cold and cold_api). Ideally it should happen again inside the report runner before executing the report and passing the inputs as parameters.

### First steps

The collaborator report interface has been implemented as a simple web page where a TypeScript defined form is injected and used to implement the user interface. This uses Deno's bundle ability to transform the TypeScript into JavaScript along with included TypeScript modules client client_api.ts used to integrate with cold_api.

The cold.ts (cold middleware) uses the exports from browser_api.ts to vet things before sending them to the cold_api which is implemented using datasetd. browser_api.ts needs to be modified to support the parameterized report request and needs to know about the cold_api.yaml configuration holding the inputs array defining how to interpret and vet the inputs submitted from the web form.
Both the inputs definition and the parameters need to be embedded in the reports.ds object that queues reports requests.

### Second steps

The report runner needs to be smarter before it runs the command associated with the requested report.  It inputs are defined then it will need to re-vet them before handing of to the sub process spawned to execute the report.

### Layers of defense

We are defending three vectors of problems, user error, programmer error and mischief. User error can be addressed browser side and poses a lower risk. Mitigation efforts can be taken against a programming mistake up to calling the report executable. Programmers need to be resposible in implementing the reports (example if they write code that erases everything that's on them, similar if it hands back privilleged informaiton that too is on them). Mischief should be addressed at each stage. COLD runs behind shibboleth which provides authentication, user id is used for authorization (access to cold, everyone has the same privilege once they have access). Validating the inputs again in the cold middleware is the next line of defense, similarly we can validate before calling the report executable.

### Validating inputs

There is limited developer time available to implement the parameterized reports (though this technique will be reused in the Thesis Management System which shares COLD's architecture). I think there are could levels of validation that can be provided.

1. Valdiate based on HTML5 input element types (this aligns with what is being transmitted and could be built-in to the middleware and runner using a single TypeScript module)
2. A hybrid, HTML5 input elements types plus text area and the identifier validation provided by metadata tools
3. Custom validation methods (more complex but more refined, would let us target specific library data needs)

The minimum validation approach is one, two could be quickly added. Three is tricky and will make the cold codebase more brittle. One and two have a high potential for reuse.

## Notes

It is incredibly import to validate inputs before the runner hands them off to the OS to be run. My nightmare is a report is launched that then is hijack to compromise the operating system itself.  The browser needs to vet, the middleware needs to vet, the report runner needs to vet and the code in the report executable should again vet the inputs in some way. No level in the chain of execution should assume things are safe!

Parameterized reports should never accept free text. If the report is written in Bash then we can use the metadata tools module to build simple command line validator programs to vet inputs. You can also call out to a python script (example idutils package) or awk. If the report is implemented as a Python program then inputs can again be vetted there.

In the cold_report.ts I have added a new Interface called InputsInterface this has three fields. `identifier` is the string holding the identifier name. `type` holds an HTML5 input type or an identifier type defined in metadatatools. The first field indicates if this is a required parameter. If true the report request should be rejected if it is not provided.  Any parameters passed without a definition should be rejected in the middleware. Any parameters passed without a definition should be discarded by the report runner. Only defined parameters are allowed to be processed.

Here's an example of the COLD reports definition of the collaborator report.

~~~yaml
run_collaborator_report:
  cmd: ./run_collaborator_report.bash
  inputs:
    - id: clpid
      type: clpid
      required: true
    - id: file_prefix
      type: text
      required: true
  basename: nsf_collaborator_report
  append_datestamp: false
  content_type: application/vnd.ms-excel
~~~

The inputs is used to validate any parameters passed into the reports queue by the report request handler. There are four times validation is critically important. 

1. In the Web UI to prevent a user to requesting a report without sufficient information (prevent the user from wasting their time)
2. In the middleware that processes the report request (so we don't queue anything unnecessarily)
3. In the runner the parameters passed to the runner must still match the input expectation and be validate
4. The report itself needs to also take responsibility to do sanity checking if it will accept inputs (paramaters).

The first validation happens browser side and is maybe as simple as a regexp in the input field (or browser side validation via metadatatools TypeScript package).  This step is as easy as mocking up an HTML page and including appropriate CSS and JavaScript to submit the form.

Steps two and three happen in server side TypeScript programs. The middle way, cold.ts, needs to validate inputs as a mater of course.  Prior version (<= v0.0.38) only validated the report name and id (against the values stored in cold_reports.yaml). With parameterized reports the report needs to validate any form parameters received an integrate them into the report request object stored in the dataset collection reports.ds.  The runner will again validate the inputs described in the cold_reports.yaml against parameters (query parameters or form fields and value) in the report request object. If that checks out OK then the report can be run.

Why is this validation important?  The reports in COLD are implemented as scripts and browsers. They run at the privilage of the report runner service.  This is where the fourth layer of security needs to be layered in. The report runner can read the file system, call various programs and that is both it's convienence in implementation and its weakness from a security point of view. **The report runner is only the next to last check before processes get launched**. The report needs to be responsibly implemented to prevent adverse side effects too.

The ring defenses are pretty standard security practice. Allowing parameterized reports increasing the stakes with injected attackes via the parameters. Vetting can't be left to the browser, the middleware, the runner alone.

Writing a safe parameterized report. There are some rules that the developer will need to enforce.

1. Vet and validate the inputs to the reports (example parameters passed over the command line, only allow parameters to be passed via the command line)
2. The parameters passed should never change the flow of processes launched they should only provide values that ultimately applied in a SQL query
3. Any file system names in a report output need to be independently derived from data in being processed and not directly form input.
4. Since the report runner will eventually write output the the rpt directory in the htdocs root, the pathing of any generated filenames must be vetted and sanity checked

Clear separation of concerns are important at each circle of defense. Single sign-on of the production systems is the first circle of defense. Each hande off forms another layer of defense, sign-on, middleware, report service, report runner, the report itself. This increases the burden on the person writing parameterized reports. The report itself also needs to enforce sanitiy checking and gaurd against abuse. Security practice is best at all levels.
