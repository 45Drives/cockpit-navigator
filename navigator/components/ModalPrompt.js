export class ModalPrompt {
    constructor() {
        this.ok = document.createElement("button");
        this.ok.innerText = "OK";
        this.ok.classList.add("pf-c-button", "pf-m-secondary");
        this.yes = document.createElement("button");
        this.yes.innerText = "Yes";
        this.yes.classList.add("pf-c-button", "pf-m-primary");
        this.no = document.createElement("button");
        this.no.innerText = "No";
        this.no.classList.add("pf-c-button", "pf-m-secondary");
        this.construct_element();
    }

    construct_element() {
        let bg = this.modal = document.createElement("div");
        bg.classList.add("modal");
        let fg = document.createElement("div");
        fg.classList.add("modal-dialog");
        bg.appendChild(fg);
        let popup = document.createElement("div");
        popup.classList.add("modal-content");
        fg.appendChild(popup);
        let header = document.createElement("div");
        header.classList.add("modal-header");
        popup.appendChild(header);
        let header_text = this.header = document.createElement("h4");
        header_text.classList.add("modal-title");
        header.appendChild(header_text);
        let body = this.body = document.createElement("div");
        body.classList.add("modal-body");
        popup.appendChild(body);
        let footer = this.footer = document.createElement("div");
        footer.classList.add("modal-footer");
        footer.style.display = "flex";
        footer.style.flexFlow = "row no-wrap";
        footer.style.justifyContent = "flex-end";
        popup.appendChild(footer);
        document.body.appendChild(this.modal);
    }

    show() {
        this.modal.style.display = "block";
    }

    hide() {
        this.modal.style.display = "none";
    }

    /**
     * 
     * @param {string} header 
     */
    set_header(header) {
        this.header.innerText = header;
    }

    set_body(message) {
        this.body.innerHTML = "";
        this.body.innerText = message;
    }

    alert(header, message = "") {
        this.set_header(header);
        this.set_body(message);
        this.footer.innerHTML = "";
        this.footer.appendChild(this.ok);
        this.show();
        return new Promise((resolve, reject) => {
            this.ok.onclick = () => {
                resolve();
                this.hide();
            }
        });
    }

    confirm(header, message = "") {
        this.set_header(header);
        this.set_body(message);
        this.footer.innerHTML = "";
        this.footer.appendChild(this.no);
        this.footer.appendChild(this.yes);
        this.show();
        return new Promise((resolve, reject) => {
            let resolve_true = () => {
                resolve(true);
                this.hide();
            }
            let resolve_false = () => {
                resolve(false);
                this.hide();
            }
            this.confirm.onclick = this.yes.onclick = resolve_true;
            this.no.onclick = resolve_false;
        });
    }
}

