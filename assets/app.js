(function () {
  const STORAGE_KEY = "procurement-demo-data";
  const { sum } = window.ProcurementUtils;

  const SEED_DATA = {
    categories: [
      {
        id: "CAT-0001",
        name: "IT Equipment",
        budgetAllocated: 50000,
        budgetCommitted: 0,
        budgetSpent: 0,
      },
      {
        id: "CAT-0002",
        name: "Office Supplies",
        budgetAllocated: 15000,
        budgetCommitted: 0,
        budgetSpent: 0,
      },
      {
        id: "CAT-0003",
        name: "Professional Services",
        budgetAllocated: 30000,
        budgetCommitted: 0,
        budgetSpent: 0,
      },
    ],
    products: [
      {
        id: "PROD-0001",
        sku: "LPT-15",
        name: "15\" Business Laptop",
        categoryId: "CAT-0001",
        price: 1250,
      },
      {
        id: "PROD-0002",
        sku: "MON-24",
        name: "24\" Monitor",
        categoryId: "CAT-0001",
        price: 240,
      },
      {
        id: "PROD-0003",
        sku: "STN-001",
        name: "Standing Desk",
        categoryId: "CAT-0002",
        price: 560,
      },
      {
        id: "PROD-0004",
        sku: "SUP-NTBK",
        name: "A4 Notebook Pack",
        categoryId: "CAT-0002",
        price: 18,
      },
      {
        id: "PROD-0005",
        sku: "SRV-ONBD",
        name: "Onboarding Consulting (Day)",
        categoryId: "CAT-0003",
        price: 950,
      },
    ],
    requests: [
      {
        id: "PR-0001",
        requester: "Alice Johnson",
        requesterEmail: "alice.johnson@example.com",
        department: "Information Technology",
        title: "Laptop refresh for onboarding cohort",
        neededBy: "2024-03-20",
        requestedAt: "2024-03-01",
        status: "Approved",
        lines: [
          { productId: "PROD-0001", qty: 5, price: 1250 },
          { productId: "PROD-0002", qty: 5, price: 240 },
        ],
        notes: "Refresh laptops for onboarding class.",
      },
      {
        id: "PR-0002",
        requester: "Carlos Diaz",
        requesterEmail: "carlos.diaz@example.com",
        department: "Workplace Experience",
        title: "Collaboration space furniture",
        neededBy: "2024-05-05",
        requestedAt: "2024-04-10",
        status: "Submitted",
        lines: [
          { productId: "PROD-0003", qty: 4, price: 560 },
          { productId: "PROD-0004", qty: 20, price: 18 },
        ],
        notes: "New collaboration space equipment.",
      },
      {
        id: "PR-0003",
        requester: "Priya Patel",
        requesterEmail: "priya.patel@example.com",
        department: "Customer Success",
        title: "Enablement workshop facilitation",
        neededBy: "2024-06-01",
        requestedAt: "2024-04-15",
        status: "Draft",
        lines: [
          { productId: "PROD-0005", qty: 3, price: 950 },
        ],
        notes: "Customer success enablement workshops.",
      },
    ],
    orders: [],
    payments: [],
    meta: {
      counters: {
        request: 3,
        order: 0,
        payment: 0,
      },
      lastSeededAt: new Date().toISOString(),
    },
  };

  const REQUEST_TRANSITIONS = {
    Draft: ["Submitted"],
    Submitted: ["Approved", "Rejected", "Cancelled"],
    Approved: ["Cancelled"],
    Rejected: [],
    Cancelled: [],
  };

  const ORDER_TRANSITIONS = {
    Open: ["Closed"],
    Closed: [],
  };

  const PAYMENT_TRANSITIONS = {
    Submitted: ["Approved", "Paid"],
    Approved: ["Paid"],
    Paid: [],
  };

  const listeners = new Set();

  function clone(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function migrateData(data) {
    if (!data || typeof data !== "object") {
      return clone(SEED_DATA);
    }

    data.categories = normalizeArray(data.categories);
    data.products = normalizeArray(data.products);
    data.requests = normalizeArray(data.requests);
    data.orders = normalizeArray(data.orders);
    data.payments = normalizeArray(data.payments);
    data.meta = data.meta || {};
    data.meta.counters = data.meta.counters || {};

    data.requests.forEach((request, index) => {
      request.requesterEmail = request.requesterEmail || "";
      request.department = request.department || "";
      request.title = request.title || `Purchase Request ${request.id || index + 1}`;
      request.neededBy = request.neededBy || request.requestedAt || "";
      request.notes = request.notes || "";
    });

    data.orders.forEach((order, index) => {
      order.buyer = order.buyer || "";
      order.buyerEmail = order.buyerEmail || "";
      const fallbackDate = order.orderDate || (order.createdAt ? order.createdAt.slice(0, 10) : "");
      order.orderDate = fallbackDate;
      order.paymentTerms = order.paymentTerms || "";
      order.notes = order.notes || "";
      if (!order.id) {
        order.id = `PO-${String(index + 1).padStart(4, "0")}`;
      }
    });

    data.payments.forEach((payment, index) => {
      payment.submitter = payment.submitter || "";
      payment.submitterEmail = payment.submitterEmail || "";
      payment.invoiceNumber = payment.invoiceNumber || `Invoice ${payment.id || index + 1}`;
      const fallbackInvoiceDate = payment.invoiceDate || (payment.createdAt ? payment.createdAt.slice(0, 10) : "");
      payment.invoiceDate = fallbackInvoiceDate;
      payment.notes = payment.notes || "";
    });

    return data;
  }

  function seedData() {
    const seed = migrateData(clone(SEED_DATA));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seedData();
    }
    try {
      return migrateData(JSON.parse(raw));
    } catch (error) {
      console.warn("Failed to parse procurement data. Resetting seed.", error);
      return seedData();
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notify();
  }

  function ensureSeeded() {
    return loadData();
  }

  function resetDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    const seeded = seedData();
    notify();
    return seeded;
  }

  function notify() {
    const state = clone(loadData());
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getProductsMap(data) {
    const map = new Map();
    data.products.forEach((product) => map.set(product.id, product));
    return map;
  }

  function recalcBudgets(data) {
    const categories = data.categories;
    const products = getProductsMap(data);

    categories.forEach((category) => {
      category.budgetCommitted = 0;
      category.budgetSpent = 0;
      category.budgetAvailable = category.budgetAllocated;
    });

    data.requests.forEach((request) => {
      if (["Submitted", "Approved"].includes(request.status)) {
        request.lines.forEach((line) => {
          const product = products.get(line.productId);
          if (!product) return;
          const category = categories.find((c) => c.id === product.categoryId);
          if (!category) return;
          const amount = Number(line.qty || 0) * Number(line.price || 0);
          category.budgetCommitted += amount;
        });
      }
    });

    data.payments.forEach((payment) => {
      if (payment.status === "Paid") {
        const order = data.orders.find((o) => o.id === payment.poId);
        if (!order) return;
        order.lines.forEach((line) => {
          const product = products.get(line.productId);
          if (!product) return;
          const category = categories.find((c) => c.id === product.categoryId);
          if (!category) return;
          const proportion = line.qty * line.price / order.totalAmount;
          const amount = payment.amount * (Number.isFinite(proportion) ? proportion : 0);
          category.budgetSpent += amount;
        });
      }
    });

    categories.forEach((category) => {
      category.budgetAvailable = category.budgetAllocated - category.budgetCommitted - category.budgetSpent;
    });
  }

  function enrichRequest(request, data) {
    const products = getProductsMap(data);
    const total = sum(
      request.lines.map((line) => Number(line.qty || 0) * Number(line.price || 0))
    );
    const detailedLines = request.lines.map((line) => {
      const product = products.get(line.productId);
      return {
        ...line,
        productName: product ? product.name : "Unknown product",
        categoryId: product ? product.categoryId : undefined,
        total: Number(line.qty || 0) * Number(line.price || 0),
      };
    });
    return {
      ...request,
      total,
      lines: detailedLines,
    };
  }

  function enrichOrder(order, data) {
    const request = data.requests.find((req) => req.id === order.requestId);
    const products = getProductsMap(data);
    const total = sum(
      order.lines.map((line) => Number(line.qty || 0) * Number(line.price || 0))
    );
    return {
      ...order,
      request,
      totalAmount: total,
      lines: order.lines.map((line) => {
        const product = products.get(line.productId);
        return {
          ...line,
          productName: product ? product.name : "Unknown product",
        };
      }),
    };
  }

  function enrichPayment(payment, data) {
    const order = data.orders.find((o) => o.id === payment.poId);
    return {
      ...payment,
      order,
    };
  }

  function updateCounters(data, type) {
    const counters = data.meta?.counters || {};
    counters[type] = (counters[type] || 0) + 1;
    data.meta.counters = counters;
    return counters[type];
  }

  function createPurchaseRequest(payload) {
    const data = loadData();
    const lines = (payload.lines || [])
      .filter((line) => line.productId && Number(line.qty) > 0)
      .map((line) => ({
        productId: line.productId,
        qty: Number(line.qty),
        price: Number(line.price),
      }));

    const requester = (payload.requester || "").trim();
    const requesterEmail = (payload.requesterEmail || "").trim();
    const department = (payload.department || "").trim();
    const title = (payload.title || "").trim();
    const neededBy = payload.neededBy || "";

    if (!requester) {
      throw new Error("Requester name is required.");
    }
    if (!requesterEmail) {
      throw new Error("Requester email is required.");
    }
    if (!department) {
      throw new Error("Department is required.");
    }
    if (!title) {
      throw new Error("Request title is required.");
    }
    if (!neededBy) {
      throw new Error("Needed by date is required.");
    }
    if (!lines.length) {
      throw new Error("At least one line item is required.");
    }

    const idNumber = updateCounters(data, "request");
    const request = {
      id: `PR-${String(idNumber).padStart(4, "0")}`,
      requester,
      requesterEmail,
      department,
      title,
      neededBy,
      requestedAt: new Date().toISOString(),
      status: "Draft",
      notes: payload.notes || "",
      lines,
    };

    data.requests.push(request);
    recalcBudgets(data);
    saveData(data);
    return enrichRequest(request, data);
  }

  function getRequestById(id) {
    const data = loadData();
    const request = data.requests.find((item) => item.id === id);
    if (!request) {
      throw new Error("Request not found");
    }
    return { request, data };
  }

  function updateRequestStatus(id, targetStatus) {
    const { request, data } = getRequestById(id);
    const allowed = REQUEST_TRANSITIONS[request.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new Error(`Cannot transition request from ${request.status} to ${targetStatus}.`);
    }
    request.status = targetStatus;
    if (targetStatus === "Submitted" && !request.requestedAt) {
      request.requestedAt = new Date().toISOString();
    }
    recalcBudgets(data);
    saveData(data);
    return enrichRequest(request, data);
  }

  function deletePurchaseRequest(id) {
    const data = loadData();
    const index = data.requests.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("Request not found");
    }
    data.requests.splice(index, 1);
    recalcBudgets(data);
    saveData(data);
  }

  function createPurchaseOrder(payload) {
    const data = loadData();
    const request = data.requests.find((item) => item.id === payload.requestId);
    if (!request) {
      throw new Error("A valid purchase request is required.");
    }
    if (request.status !== "Approved") {
      throw new Error("Only approved requests can generate purchase orders.");
    }

    const buyer = (payload.buyer || "").trim();
    const buyerEmail = (payload.buyerEmail || "").trim();
    const vendor = (payload.vendor || "").trim();
    const orderDate = payload.orderDate || "";
    const paymentTerms = (payload.paymentTerms || "").trim();

    if (!buyer) {
      throw new Error("Buyer name is required.");
    }
    if (!buyerEmail) {
      throw new Error("Buyer email is required.");
    }
    if (!vendor) {
      throw new Error("Vendor name is required.");
    }
    if (!orderDate) {
      throw new Error("Order date is required.");
    }

    const lines = request.lines.map((line) => ({
      productId: line.productId,
      qty: Number(line.qty),
      price: Number(line.price),
    }));

    const idNumber = updateCounters(data, "order");
    const order = {
      id: `PO-${String(idNumber).padStart(4, "0")}`,
      requestId: request.id,
      vendor,
      buyer,
      buyerEmail,
      orderDate,
      paymentTerms,
      status: "Open",
      createdAt: new Date().toISOString(),
      lines,
      totalAmount: sum(lines.map((line) => line.qty * line.price)),
      notes: payload.notes || "",
    };

    data.orders.push(order);
    recalcBudgets(data);
    saveData(data);
    return enrichOrder(order, data);
  }

  function getOrderById(id) {
    const data = loadData();
    const order = data.orders.find((item) => item.id === id);
    if (!order) {
      throw new Error("Order not found");
    }
    return { order, data };
  }

  function updateOrderStatus(id, targetStatus) {
    const { order, data } = getOrderById(id);
    const allowed = ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new Error(`Cannot transition order from ${order.status} to ${targetStatus}.`);
    }
    order.status = targetStatus;
    recalcBudgets(data);
    saveData(data);
    return enrichOrder(order, data);
  }

  function createPaymentRequest(payload) {
    const data = loadData();
    const order = data.orders.find((item) => item.id === payload.poId);
    if (!order) {
      throw new Error("A valid purchase order is required.");
    }

    const submitter = (payload.submitter || "").trim();
    const submitterEmail = (payload.submitterEmail || "").trim();
    const invoiceNumber = (payload.invoiceNumber || "").trim();
    const invoiceDate = payload.invoiceDate || "";

    if (!submitter) {
      throw new Error("Payment requester name is required.");
    }
    if (!submitterEmail) {
      throw new Error("Payment requester email is required.");
    }
    if (!invoiceNumber) {
      throw new Error("Invoice number is required.");
    }
    if (!invoiceDate) {
      throw new Error("Invoice date is required.");
    }

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const paidToDate = data.payments
      .filter((existing) => existing.poId === order.id && existing.status === "Paid")
      .reduce((total, existing) => total + Number(existing.amount || 0), 0);
    const remaining = Math.max(order.totalAmount - paidToDate, 0);
    if (amount > remaining + 0.01) {
      throw new Error("Payment amount exceeds remaining balance for this order.");
    }

    const idNumber = updateCounters(data, "payment");
    const payment = {
      id: `PAY-${String(idNumber).padStart(4, "0")}`,
      poId: order.id,
      amount,
      submitter,
      submitterEmail,
      invoiceNumber,
      invoiceDate,
      status: "Submitted",
      createdAt: new Date().toISOString(),
      notes: payload.notes || "",
    };

    data.payments.push(payment);
    recalcBudgets(data);
    saveData(data);
    return enrichPayment(payment, data);
  }

  function getPaymentById(id) {
    const data = loadData();
    const payment = data.payments.find((item) => item.id === id);
    if (!payment) {
      throw new Error("Payment not found");
    }
    return { payment, data };
  }

  function updatePaymentStatus(id, targetStatus) {
    const { payment, data } = getPaymentById(id);
    const allowed = PAYMENT_TRANSITIONS[payment.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new Error(`Cannot transition payment from ${payment.status} to ${targetStatus}.`);
    }
    payment.status = targetStatus;
    recalcBudgets(data);
    saveData(data);
    return enrichPayment(payment, data);
  }

  function listCategories() {
    const data = loadData();
    recalcBudgets(data);
    saveData(data);
    return data.categories.map((category) => ({ ...category }));
  }

  function listProducts() {
    const data = loadData();
    return data.products.map((product) => ({ ...product }));
  }

  function listRequests() {
    const data = loadData();
    return data.requests.map((request) => enrichRequest(request, data));
  }

  function listOrders() {
    const data = loadData();
    return data.orders.map((order) => enrichOrder(order, data));
  }

  function listPayments() {
    const data = loadData();
    return data.payments.map((payment) => enrichPayment(payment, data));
  }

  window.ProcurementApp = {
    ensureSeeded,
    resetDemoData,
    subscribe,
    getState: () => clone(loadData()),
    listCategories,
    listProducts,
    listRequests,
    listOrders,
    listPayments,
    createPurchaseRequest,
    submitPurchaseRequest: (id) => updateRequestStatus(id, "Submitted"),
    approvePurchaseRequest: (id) => updateRequestStatus(id, "Approved"),
    rejectPurchaseRequest: (id) => updateRequestStatus(id, "Rejected"),
    cancelPurchaseRequest: (id) => updateRequestStatus(id, "Cancelled"),
    deletePurchaseRequest,
    createPurchaseOrder,
    closePurchaseOrder: (id) => updateOrderStatus(id, "Closed"),
    createPaymentRequest,
    approvePayment: (id) => updatePaymentStatus(id, "Approved"),
    markPaymentPaid: (id) => updatePaymentStatus(id, "Paid"),
  };

  document.addEventListener("DOMContentLoaded", () => {
    const data = ensureSeeded();
    recalcBudgets(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  });
})();
