(function () {
  const { formatCurrency } = window.ProcurementUtils;

  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) {
      element.className = options.className;
    }
    if (options.text) {
      element.textContent = options.text;
    }
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          element.setAttribute(key, value);
        }
      });
    }
    return element;
  }

  function clearChildren(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function ensureToastContainer() {
    let container = qs("#toast-container");
    if (!container) {
      container = createElement("div", { className: "toast-container", attrs: { id: "toast-container" } });
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, variant = "info") {
    const container = ensureToastContainer();
    const toast = createElement("div", { className: `toast toast-${variant}` });
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function showConfirm(message, onConfirm, options = {}) {
    const overlay = createElement("div", { className: "modal-overlay", attrs: { role: "dialog", "aria-modal": "true" } });
    const modal = createElement("div", { className: "modal" });
    const text = createElement("p", { text: message });
    const buttons = createElement("div", { className: "modal-actions" });
    const confirmButton = createElement("button", {
      className: "btn btn-primary",
      text: options.confirmLabel || "Confirm",
    });
    const cancelButton = createElement("button", {
      className: "btn btn-secondary",
      text: options.cancelLabel || "Cancel",
    });

    confirmButton.addEventListener("click", () => {
      onConfirm();
      overlay.remove();
    });
    cancelButton.addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    buttons.append(confirmButton, cancelButton);
    modal.append(text, buttons);
    overlay.append(modal);
    document.body.appendChild(overlay);
    confirmButton.focus();
  }

  function showModal({ title, content, onClose }) {
    const overlay = createElement("div", { className: "modal-overlay", attrs: { role: "dialog", "aria-modal": "true" } });
    const modal = createElement("div", { className: "modal" });
    const heading = createElement("h3", { text: title, className: "modal-title" });
    const body = createElement("div", { className: "modal-body" });
    const closeButton = createElement("button", {
      className: "btn btn-secondary modal-close",
      text: "Close",
    });

    if (typeof content === "string") {
      body.innerHTML = content;
    } else if (content instanceof Node) {
      body.appendChild(content);
    }

    closeButton.addEventListener("click", () => {
      overlay.remove();
      if (typeof onClose === "function") {
        onClose();
      }
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
        if (typeof onClose === "function") {
          onClose();
        }
      }
    });

    modal.append(heading, body, closeButton);
    overlay.append(modal);
    document.body.appendChild(overlay);
    closeButton.focus();
  }

  function renderTable(container, columns, rows) {
    clearChildren(container);
    const table = createElement("table", { className: "data-table" });
    const thead = createElement("thead");
    const headerRow = createElement("tr");

    columns.forEach((column) => {
      const th = createElement("th", { text: column.label });
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = createElement("tbody");

    rows.forEach((row) => {
      const tr = createElement("tr");
      columns.forEach((column) => {
        const td = createElement("td");
        if (column.type === "actions" && Array.isArray(column.actions)) {
          column.actions(row).forEach((action) => {
            const button = createElement("button", {
              className: `btn btn-${action.variant || "secondary"} btn-xs`,
              text: action.label,
            });
            button.addEventListener("click", (event) => {
              event.stopPropagation();
              action.onAction(row);
            });
            td.appendChild(button);
          });
        } else {
          const value = column.render ? column.render(row[column.key], row) : row[column.key];
          td.textContent = value != null ? value : "-";
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.append(thead, tbody);
    container.appendChild(table);
  }

  function populateSelect(select, options, placeholder = "Select...") {
    clearChildren(select);
    if (placeholder) {
      const option = createElement("option", { text: placeholder, attrs: { value: "" } });
      select.appendChild(option);
    }
    options.forEach((item) => {
      const option = createElement("option", {
        text: item.label,
        attrs: { value: item.value },
      });
      if (item.disabled) {
        option.disabled = true;
      }
      select.appendChild(option);
    });
  }

  function bindForm(form, handler) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      handler(data, form);
    });
  }

  function renderCategorySummary(container, categories) {
    clearChildren(container);
    const list = createElement("div", { className: "category-summary" });
    categories.forEach((category) => {
      const card = createElement("article", { className: "category-card" });
      const title = createElement("h3", { text: category.name });
      const allocated = createElement("p", {
        className: "metric",
        text: `Allocated: ${formatCurrency(category.budgetAllocated)}`,
      });
      const committed = createElement("p", {
        className: "metric",
        text: `Committed: ${formatCurrency(category.budgetCommitted || 0)}`,
      });
      const spent = createElement("p", {
        className: "metric",
        text: `Spent: ${formatCurrency(category.budgetSpent || 0)}`,
      });
      const available = createElement("p", {
        className: "metric metric-available",
        text: `Available: ${formatCurrency(category.budgetAvailable || 0)}`,
      });
      card.append(title, allocated, committed, spent, available);
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  function buildLineItemRow(products, onRemove) {
    const row = createElement("div", { className: "line-item" });
    const productSelect = createElement("select", {
      className: "input",
      attrs: { required: "required", name: "productId" },
    });
    populateSelect(
      productSelect,
      products.map((product) => ({
        label: `${product.name} (${formatCurrency(product.price)})`,
        value: product.id,
      })),
      "Choose a product"
    );

    const qtyInput = createElement("input", {
      className: "input",
      attrs: {
        type: "number",
        name: "qty",
        min: "1",
        value: "1",
        required: "required",
      },
    });

    const priceInput = createElement("input", {
      className: "input",
      attrs: {
        type: "number",
        name: "price",
        min: "0",
        step: "0.01",
        required: "required",
      },
    });

    const totalDisplay = createElement("span", { className: "line-total", text: formatCurrency(0) });
    const removeButton = createElement("button", {
      className: "btn btn-link btn-remove",
      text: "Remove",
      attrs: { type: "button" },
    });

    function updatePrice() {
      const selected = products.find((product) => product.id === productSelect.value);
      priceInput.value = selected ? selected.price : priceInput.value;
      updateTotal();
    }

    function updateTotal() {
      const total = Number(qtyInput.value || 0) * Number(priceInput.value || 0);
      totalDisplay.textContent = formatCurrency(total);
    }

    productSelect.addEventListener("change", updatePrice);
    qtyInput.addEventListener("input", updateTotal);
    priceInput.addEventListener("input", updateTotal);
    removeButton.addEventListener("click", () => {
      if (typeof onRemove === "function") {
        onRemove(row);
      }
    });

    updatePrice();

    row.append(productSelect, qtyInput, priceInput, totalDisplay, removeButton);
    return row;
  }

  window.UIHelpers = {
    qs,
    showToast,
    showConfirm,
    showModal,
    renderTable,
    populateSelect,
    bindForm,
    renderCategorySummary,
    buildLineItemRow,
  };
})();
