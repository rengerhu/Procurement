(function () {
  const ID_PREFIXES = {
    category: "CAT",
    product: "PROD",
    request: "PR",
    order: "PO",
    payment: "PAY",
  };

  function pad(num, size = 4) {
    return String(num).padStart(size, "0");
  }

  function generateId(type, lastNumber = Date.now()) {
    const prefix = ID_PREFIXES[type] || "ID";
    return `${prefix}-${pad(lastNumber % 100000)}`;
  }

  function formatCurrency(value, currency = "USD") {
    const number = Number(value) || 0;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(number);
  }

  function formatNumber(value, options = {}) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(number);
  }

  function formatDate(date) {
    const instance = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(instance.getTime())) {
      return "-";
    }
    return instance.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function sum(values) {
    return values.reduce((total, value) => total + Number(value || 0), 0);
  }

  window.ProcurementUtils = {
    generateId,
    formatCurrency,
    formatNumber,
    formatDate,
    sum,
  };
})();
