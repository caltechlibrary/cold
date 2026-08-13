import { ClientAPI } from "./client_api.ts";
import { renderPersonDetails } from "./person_details.ts";

const clientAPI = new ClientAPI();

document.addEventListener("focusout", async (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (target.id !== "old_clpid") return;

    const oldClpidElem = document.getElementById(
        "old_clpid",
    ) as HTMLInputElement | null;
    const newClpidElem = document.getElementById(
        "new_clpid",
    ) as HTMLInputElement | null;
    const submitElem = document.getElementById(
        "rename_submit",
    ) as HTMLInputElement | null;
    const detailsDiv = document.getElementById(
        "person_details",
    ) as HTMLElement | null;

    const clpid = oldClpidElem?.value.trim() ?? "";
    if (clpid === "") {
        if (newClpidElem) newClpidElem.disabled = true;
        if (submitElem) submitElem.disabled = true;
        if (detailsDiv) detailsDiv.innerHTML = "";
        return;
    }

    const results = await clientAPI.lookupPersonByClpid(clpid);
    if (results && results.length > 0) {
        const person = results[0];
        if (detailsDiv) {
            detailsDiv.style.color = "";
            detailsDiv.innerHTML = renderPersonDetails(person);
        }
        if (newClpidElem) {
            newClpidElem.disabled = false;
            newClpidElem.focus();
        }
        if (submitElem) submitElem.disabled = false;
    } else {
        if (detailsDiv) {
            detailsDiv.style.color = "red";
            detailsDiv.textContent = "Person ID not found.";
        }
        if (newClpidElem) newClpidElem.disabled = true;
        if (submitElem) submitElem.disabled = true;
    }
});
