const btn_uper = document.getElementById("suBtn");
const phone = document.getElementById("suPhone");
const errorMessage = document.getElementById("error_of_pas");

const form = document.getElementById("suForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault(); 

    const data = {
        firstname: form.firstname.value.trim(),
        lastname: form.lastname.value.trim(),
        email: form.email.value.trim(),
        phonenumber: phone.value.trim(),
        country: form.country.value.trim(),
        password1: form.password1.value,
        password2: form.password2.value,
        terms: document.getElementById("chkTerms").checked,
        ageConfirmed: document.getElementById("chkAge").checked
    };

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (!response.ok || result.success === false) {
            errorMessage.textContent = result.errors;
            return;
        }else{
            window.location.href = "/dashboard";
        }
    } catch (error) {
        console.log(error);
    }
});