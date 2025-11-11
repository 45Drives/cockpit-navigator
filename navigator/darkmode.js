function isCockpitStyleValue(value) {
    return value !== null && ["auto", "dark", "light"].includes(value);
}

const setDarkMode = (style) => {
    style =
        style ??
        localStorage.getItem("shell:style") ??
        "auto";
	const logo = document.getElementById("logo-45d");
    if (
        (window.matchMedia?.("(prefers-color-scheme: dark)").matches &&
            style === "auto") ||
        style === "dark"
    ) {
        document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		logo.src = "branding/logo-dark.svg";
    } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
		logo.src = "branding/logo-light.svg";
    }
};

window.addEventListener("storage", event => {
    if (event.key === "shell:style" && isCockpitStyleValue(event.newValue)) {
        setDarkMode(event.newValue);
    }
});

// When changing the theme from the shell switcher the localstorage change will not fire for the same page (aka shell)
// so we need to listen for the event on the window object.
window.addEventListener("cockpit-style", (event) => {
    const styleEvent = event;
    const style = styleEvent.detail?.style;
    if (style === undefined || !isCockpitStyleValue(style)) {
        return;
    }

    setDarkMode(style);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    setDarkMode();
});

setDarkMode();
