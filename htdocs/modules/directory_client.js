//
// directory_client.ts / htdocs/js/directory_client.js
// this code connects to the proxied directory API service
// for integration into our edit people page.
//
const directory_elem = document.getElementById("directory_user_id");
let directory_id = directory_elem.value;
function updateRecord(obj) {
  const family_name_elem = document.getElementById("family_name"),
    lived_name_elem = document.getElementById("given_name"),
    display_name_elem = document.getElementById("display_name"),
    title_elem = document.getElementById("title"),
    email_elem = document.getElementById("email"),
    division_elem = document.getElementById("division"),
    bio_elem = document.getElementById("bio"),
    directory_person_type = document.getElementById("directory_person_type"),
    caltech_elem = document.getElementById("caltech"),
    ror_elem = document.getElementById("ror");
  if (obj !== undefined && obj !== null) {
    if (obj.display_name !== undefined && obj.display_name !== "") {
      display_name_elem.value = obj.display_name;
    }
    if (obj.family_name !== undefined && obj.family_name !== "") {
      family_name_elem.value = obj.family_name;
    }
    if (obj.given_name !== undefined && obj.given_name !== "") {
      lived_name_elem.value = obj.given_name;
    }
    if (obj.email !== undefined && obj.email !== "") {
      email_elem.value = obj.email;
    }
    if (obj.division !== undefined && obj.division !== "") {
      if (division_elem.value === "") {
        division_elem.value = obj.division;
      }
    }
    if (obj.bio !== undefined && obj.bio !== "") {
      bio_elem.innerText = obj.bio;
    }
    if (
      obj.directory_person_type !== undefined &&
      obj.directory_person_type !== ""
    ) {
      directory_person_type.value = obj.directory_person_type;
    }
    if (obj.title !== undefined && obj.title !== "") {
      title_elem.value = obj.title;
    }
    ror_elem.value = "https://ror.org/05dxps055";
    caltech_elem.setAttribute("checked", "true");
  }
}
async function directoryUpdateRecord(evt) {
  directory_id = this.value;
  if (directory_id !== undefined && directory_id !== "") {
    const uri = `../directory_api/${directory_id}`;
    const resp = await fetch(uri, {
      headers: {
        "content-type": "application/json",
      },
      method: "GET",
    });
    if (resp.ok) {
      // Since we're fetching from the proxied API we will get JSON back.
      const src = await resp.text();
      //console.log("DEBUG src", src);
      if (src !== undefined && src !== "") {
        const obj = JSON.parse(src);
        //console.log(`DEBUG directory data -> ${obj}`);
        updateRecord(obj);
      }
    } else {
      console.log(`ERROR: ${resp.status} ${resp.statusText}`);
    }
  }
}
directory_elem.addEventListener("change", directoryUpdateRecord);
