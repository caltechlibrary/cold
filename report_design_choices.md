
COLD has a report request service with a web user interface.  To generate a report a report runner service is needed.

Once the report request is made a record is created in the reports.ds collection. The report runner is expected to check that collection and run requested reports keeping the records updated as the report running processes proceeds. The final step is to either return an error message of why the request failed or return the status of "available" with a link to where the report can be viewed or downloaded.

The system is deliberately simple. This is to keep it maintainable, easy for everyone to understand (developers and the people who request reports). Importantly it needs to be easy to maintain. Report systems tend towards complexity so it is vital that the initial system be as simple as possible but still accomodate both quick reports and those which may take hours to complete.

The report request process is integrated into the COLD UI. That UI lists the requests and includes a form to making a new request. When the report runner picks up a request several things need to happen.

- report status should show that the report request is being processed
- the report request needs to be validated and if their is s problem an error returned and the request processed close

If the request is valid then several things need to happen.

- the report definition needs to be retrieved (probably from memory)
- the designated script/program needs to be run (with parameters as of v0.0.40)
- the output of the script/program (stdout) needs to be read and streamed into a report document at the location specified by the report definition
- as the report executes output should be written to the web tree (e.g. `htdocs/rpt`) and a link generated
- if their is a problem the report process should terminal and the request updated with the status of error and message
- if the report executes successfully the request record should be updated wiht the status of "available" and the link
- if there are email(s) associated with the request a message needs to be sent out with the report name, final status and link if available or error message if not

Reports are programs or scripts (e.g. Bash, Python) that write their results to standard output, the runner reads that and takes care of saving the results and contacting the email addresses.

I've prototyped the report runner in TypeScript but am not happy with it. I am deciding if I should write this in Go or give Python a try.

I'm thinking reports could be simple script written in any langauge that write their output to standard out. The runner should be responsible for taking that output and writing it to an appropriate place (e.g. Google Drive).

Originally I was thinking that this should be the responsibility of the report script/program but given the level of complexity dealing with G-Drive I think the runner should be responsible for the final place the report resides.

My current view is a report request would look something like this.

```json
{
    "id": "6fec5fbf-5368-5d11-95c7-e2534752e3a5",
    "report_name": "run_collaborator_report",
    "email": "rsdoiel@caltech.edu,tmorrell@caltech.edu",
    "requested": "2024-10-25T19:37:44.169Z",
    "status": "requested",
    "link": "",
    "updated": "2024-10-25T19:37:44.169Z"
}
```

The report definition could look more like this.

```yaml
run_collaborator_report:
  cmd: ./run_collaborator_report.bash
  inputs:
    - id: clpid
      validate_with: is_clpid
      required: true
  basename: "{{clpid}}_nsf_collaborator_report"
  append_datestamp: false
  content_type: application/vnd.ms-excel
```

The runner checks `reports.ds` for report requests, takes the requested information and validates it against the predefined reports in `cold_reports.yaml`.  It runs the report capturing the output. The output is streamed to `htdocs/rpt/{{report_name}}`. `{{report_name}}` is formed from the `basename`, `content_type` and `append_datestamp` fields in the report definition. The `content_type` sets the file extension used while the `basename` functions as a curly bracket template for the report name. In this example if the collaborator report is made and the `clpid` value was `Doiel-R-S`, then the `basename` would resolve to `Doiel-R-S_nsf_collaborator_report`, since the Excel format is expressed in the content type attribute the filename extension will be xlsx. Current implementation assumes we're storing the report locally in the COLD directory website. This makes sense as the report contents remains protected by the same mechanisms as COLD itself.

COLD and its report system are in production now. The report runner (cold_report) is a service that operates along side the COLD middleware (cold) and Dataset API (cold_api). These are controlled by the systemd services on the host Linux server. The middleware and access is controlled by Apache2+Shibboleth.

## Current implementation

- cold_reports runs a service monitoring the contents of reports.ds collection
- the reports that are authorized to run are defined in cold_reports.yaml
- the report excuting programs are mostly Bash scripts
  - Bash scripts may leverage other programs
    - `dsquery`
    - `bin/group_vocabulary`
    - `bin/journal_vocabulary`
    - `../collaborator_reports/authors_nsf_table4.py`
- the Reports web UI is defined in the template, `views/report_list.hbs`
  - if adding a new report you need to update the template
  - define the new report in cold_reports.yaml
  - if the report includes parameters then you need to write a web form and add it to the `htdocs` directory
  - the cold_reports service needs to be restarted

### Implementation

The reports system has a web UI that submits a request to the COLD middelware. The `browser_api.ts` contains the details for the middleware to prepare requests to the backend JSON API web service implemented via Dataset. The COLD middleware is responsible for getting the report request into the Dataset collection `reports.ds`. The COLD report runner checks `reports.ds` and fetches the next waiting request. It setups up to run the port updating the report object in `reports.ds` and executing the requested report defined in `cold_reports.yaml`.

The scripts that run the reports usually leverage other programs (or Python scripts) to complete the request. They have full access to the COLD backend via `dsquery` as well as any other resource that can access programatically (example Python programs, curl, other cli).

The definition of the report in `cold_reports.yaml` determines the reports name which is stored in `htdocs/rpt` and then available within the COLD Web UI.

## Parameterized reports, April 2026

In April the collaborator reports was migrated from GitHub action process to COLD. Integrating the collaborator reports requires the reports system to support parameterized reports. The `clpid` is required to know which collaboorators to report on. What does the reports system need to do to safely hand off paremeters? The `cold_reports.yaml` definition needs to include a list of expected parameters including their type information. This is then used to vet the paremeters before envoking the program that generates the report content.

### Validation approaches

A good first step would be to provide built-in support to validate the inputs defined as HTML5 textarea, select and input elements. These are the types expected in the webform making the requests. Ideally validation is done each time a parameter is passed from one stage of processing to another.

### Use Case: Collaborator Reports

The collaborator report interface has been implemented as a simple web page. A TypeScript clas defines form is injected into the report request page. The TypeScript is processed into JavaScript using Deno's bundle ability. The allows for integration with other TypeScript classes like `client_api.ts` and could allow for inclusion with `metadatatools.ts` for identifier validation browser side.

The TypeScript module, `cold.ts` (cold middleware), uses the exports from `browser_api.ts` to vet things inside the middleware before sending them onto the cold_api. The `cold_api` is a JSON API run by Dataset's web service. Integration of parameterized reports involved enhancing `browser_api.ts` to include parameter handling and validation as wells as modifying the report runner defined in `cold_reports.ts`. The `reports.ds` collection serves as the communication mechanism between the COLD middleware and reports runner.

`cold_reports.ts` was enhanced to support the new `inputs` attribute in the report definition and template behavior of the revised `basename` attribute.

### Layers of defense

We are defending three vectors of problems, user error, programmer error and mischief. User error can be addressed browser side and poses a lower risk. Mitigation efforts can be taken against a programming mistake up to calling the report executable. Programmers need to be resposible in implementing the reports (example if they write code that erases everything that's on them, similar if it hands back privilleged informaiton that too is on them). Mischief should be addressed at each stage. COLD runs behind shibboleth which provides authentication, user id is used for authorization (access to cold, everyone has the same privilege once they have access). Validating the inputs again in the cold middleware is the next line of defense, similarly we can validate before calling the report executable.

### Validating inputs

There is limited developer time available to implement the parameterized reports (though this technique will be reused in the Thesis Management System which shares COLD's architecture). I think there are could levels of validation that can be provided.

1. Valdiate based on HTML5 input element types (this aligns with what is being transmitted and could be built-in to the middleware and runner using a single TypeScript module)
2. A hybrid, HTML5 input elements types plus text area and the identifier validation provided by metadata tools
3. Custom validation methods (more complex but more refined, would let us target specific library data needs)

The first two validation approaches are easy to implement quickly. Three is tricky and is not planned at this stage of development. Three's big disadvantage is the it will make the reports system brittle. At the present their are clear lines of separation between scripts implementing reports, the report runner and the COLD middleware passing on requests to `reports.ds`.

### The problem of naming reports

Once you have parameterized reports that will be picked via the COLD website (rpt subdiectory) you need a predictable way to name the report. Originally all reports had preset names. The basename attribute in the report definition mapped directly to the basename used on the file system. The content type determined the file extension. Reports were written to `htdocs/rpt`. That is how the reports system in COLD worked through release 0.0.39. It worked remarkably well.

With parameterized reports their needs to be a flexible but predictable naming convension. In COLD v0.0.40 this has been done by treating the `basename` not as a fixed filename but rather as a name template. By inclosing an input variable name in the double curly brackets it can be used as part of the rendered basename. While simple this enhances the flexibility of how reports are named. It gives us predictability when determining where to write output and what the link (URL) will be to retrieve the report when completed.

That behavior in defined in the `Runnable` object class in `cold_reports.ts`. That is also where the reports configure before running. That includes a basename to apply to the executable report's standard out before writing it to the reports directory and forming the link (URL) to point at the report. This works well for unparameterized reports. The reports get updated and replace previous versions. If the report definition includes the append datestamp option then the name will be formed with a datestamp to destinguish when the report was made. This breaks down with parameterized reports.  In the collaborator report use case I need to have the report name reflect who (which clpid) the report is for, otherwise one collaborator reports with overwite each other.

There are several points where the name is really important

1. What the basename of the report will be so a link can be calculated
2. What link to display when the report has completed (or send in an email if email notifcation is requested)
3. Where to write the report output of the report (assume the report executable's standard holds the reports contents)

The script generating the report content could easily take over duties of writing content to the `htdocs/rpt` directory. This would not require a significant change in the reports module. It is how we handle reports that are queue then run on separate machines.  There still needs to be a linkage back into the reports queue object to indicate what the link to the report is.

It is desirable to minimize the interactions between the report executable and the report runner as this presents the most flexibility in how report construction is implemented. The report executable should not know about the report runner. How then is the report name reflected in the reports queue object after completion?

The approach being taken is to presume the report name is passed as all or part of a valiable used in the parameterized report. The configuration for the basename value defined in the cold_reports.yaml file is treated as a handlebars like template. Then the basename is formed by passing the __validated__ parameters and a simple substitution can take place.  This at makes the assumption that the parameters (which are strings at the point of validation) is non-empty. To enforce this the parameters that can be used as part of the filename must be a required field.

Here's an example of the YAML used to configure the collaborator report.

~~~yaml
run_collaborator_report:
  cmd: ./run_collaborator_report.bash
  inputs:
    - id: clpid
      type: clpid
      required: true
  basename: "{{clpid}}_nsf_collaborator_report"
  append_datestamp: false
  content_type: application/vnd.ms-excel
~~~

This keeps the linkage between the report excetuable largely separate. The `clpid` value will be vetted by the browser, by the middleware and again by the report runner[^1]. The `clpid` is required so will be non-empty (or the report will be aborted). It should be safe to pass that value to the script `run_collaborator_report.bash`.

Other than exit code and error messages (prefixed with `error://` in the output of `run_collaborator_report.bash`) the report interacts minimally with the report runner (the standard output can be used as the contents of the report and written to by the current formation of the basename attribute).  The report configuration only sees the addition of the inputs attribute and the enhanced behavior of resolving the basename if the `{{` and `}}` are present.

[^1]: Ideally again inside the Bash script ./run_collaborator_report.bash and the Python script it runs.

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
