// directory_client.ts
var directory_elem = document.getElementById("directory_user_id");
var directory_id = directory_elem.value;
function updateRecord(obj) {
  const family_name_elem = document.getElementById("family_name"), lived_name_elem = document.getElementById("given_name"), display_name_elem = document.getElementById("display_name"), title_elem = document.getElementById("title"), email_elem = document.getElementById("email"), division_elem = document.getElementById("division"), bio_elem = document.getElementById("bio"), directory_person_type = document.getElementById("directory_person_type"), caltech_elem = document.getElementById("caltech"), ror_elem = document.getElementById("ror");
  if (obj !== void 0 && obj !== null) {
    if (obj.display_name !== void 0 && obj.display_name !== "") {
      display_name_elem.value = obj.display_name;
    }
    if (obj.family_name !== void 0 && obj.family_name !== "") {
      family_name_elem.value = obj.family_name;
    }
    if (obj.given_name !== void 0 && obj.given_name !== "") {
      lived_name_elem.value = obj.given_name;
    }
    if (obj.email !== void 0 && obj.email !== "" && obj.email.indexOf("[email protected]") >= 0) {
      email_elem.value = obj.email;
    }
    if (email_elem.value.indexOf("[email protected]") >= 0) {
      email_elem.value = "";
    }
    if (obj.division !== void 0 && obj.division !== "") {
      if (division_elem.value === "") {
        division_elem.value = obj.division;
      }
    }
    if (obj.bio !== void 0 && obj.bio !== "") {
      bio_elem.innerText = obj.bio;
    }
    if (obj.directory_person_type !== void 0 && obj.directory_person_type !== "") {
      directory_person_type.value = obj.directory_person_type;
    }
    if (obj.title !== void 0 && obj.title !== "") {
      title_elem.value = obj.title;
    }
    ror_elem.value = "https://ror.org/05dxps055";
    caltech_elem.setAttribute("checked", "true");
  }
}
async function directoryUpdateRecord(evt) {
  const spinnerElem = document.getElementById("spinner");
  if (directory_elem.value === void 0 || directory_elem.value === "") {
    spinnerElem === null ? "" : spinnerElem.style.display = "none";
  } else {
    spinnerElem === null ? "" : spinnerElem.style.display = "inline-block";
  }
  directory_id = this.value;
  if (directory_id !== void 0 && directory_id !== "") {
    const uri = `../directory_api/${directory_id}`;
    const resp = await fetch(uri, {
      headers: {
        "content-type": "application/json"
      },
      method: "GET"
    });
    if (resp.ok) {
      const src = await resp.text();
      if (src !== void 0 && src !== "") {
        const obj = JSON.parse(src);
        updateRecord(obj);
        spinnerElem === null ? "" : spinnerElem.style.display = "none";
      }
    } else {
      console.log(`ERROR: ${resp.status} ${resp.statusText}`);
      spinnerElem === null ? "" : spinnerElem.style.display = "none";
    }
  }
}
directory_elem.addEventListener("change", directoryUpdateRecord);
