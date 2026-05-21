(function () {
  "use strict";

  const POPULAR_LIMIT = 10;
  const DATE_SCAN_DAYS = 60;
  const CHUNK_SIZE = 10;
  const TOKEN_KEY = "roomescape-token";
  const NAME_KEY = "roomescape-name";

  const elements = {
    authSection: document.getElementById("auth-section"),
    authName: document.getElementById("auth-name"),
    authMessage: document.getElementById("auth-message"),
    logoutButton: document.getElementById("logout-button"),
    loginForm: document.getElementById("login-form"),
    signupForm: document.getElementById("signup-form"),
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    signupName: document.getElementById("signup-name"),
    signupEmail: document.getElementById("signup-email"),
    signupPassword: document.getElementById("signup-password"),
    popularList: document.getElementById("popular-list"),
    themeGrid: document.getElementById("theme-grid"),
    step1: document.getElementById("step-1"),
    step2: document.getElementById("step-2"),
    step3: document.getElementById("step-3"),
    calendarRoot: document.getElementById("calendar-root"),
    calendarLoading: document.getElementById("calendar-loading"),
    selectedThemeName: document.getElementById("selected-theme-name"),
    summaryTheme: document.getElementById("summary-theme"),
    summaryDate: document.getElementById("summary-date"),
    timeSelect: document.getElementById("time-select"),
    reserveForm: document.getElementById("reserve-form"),
    reserveMessage: document.getElementById("reserve-message"),
    btnBackThemes: document.getElementById("btn-back-to-themes"),
    btnBackCalendar: document.getElementById("btn-back-to-calendar"),
    stepIndicators: document.querySelectorAll(".steps__item"),
    navBooking: document.getElementById("nav-booking"),
    navMy: document.getElementById("nav-my"),
    bookingSections: document.querySelectorAll(".popular-section, .booking-section"),
    mySection: document.getElementById("my-reservation-section"),
    myRefreshButton: document.getElementById("my-refresh-button"),
    mySearchMsg: document.getElementById("my-search-msg"),
    myResultArea: document.getElementById("my-result-area"),
  };

  const placeholderImage =
      "data:image/svg+xml," +
      encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect fill="#202434" width="320" height="180"/><text x="160" y="95" fill="#8b93a7" font-size="16" text-anchor="middle" font-family="sans-serif">No image</text></svg>'
      );

  const state = {
    themes: [],
    selectedTheme: null,
    selectedDate: null,
    availableDates: new Set(),
    calendarMonth: new Date(),
  };

  function token() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function userName() {
    return localStorage.getItem(NAME_KEY);
  }

  function isLoggedIn() {
    return Boolean(token());
  }

  function authHeaders() {
    return token() ? { Authorization: `Bearer ${token()}` } : {};
  }

  function setMessage(el, text, ok) {
    el.textContent = text;
    el.className = "message";
    if (text) {
      el.classList.add(ok ? "message--ok" : "message--err");
    }
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = response.statusText;
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        message = await response.text() || message;
      }
      throw new Error(message);
    }
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  function formatYmd(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatTime(startAt) {
    if (!startAt) {
      return "";
    }
    return String(startAt).slice(0, 5);
  }

  function themeImageUrl(url) {
    if (!url) {
      return placeholderImage;
    }
    return url.startsWith("http") || url.startsWith("data:") ? url : url;
  }

  function applyAuthState() {
    if (isLoggedIn()) {
      elements.authSection.classList.add("is-hidden");
      elements.logoutButton.classList.remove("is-hidden");
      elements.authName.textContent = `${userName() || "사용자"}님`;
      return;
    }

    elements.authSection.classList.remove("is-hidden");
    elements.logoutButton.classList.add("is-hidden");
    elements.authName.textContent = "로그인 필요";
  }

  function requireLogin(messageTarget) {
    if (isLoggedIn()) {
      return true;
    }
    showBooking();
    setMessage(messageTarget || elements.authMessage, "로그인 후 이용할 수 있습니다.", false);
    elements.authSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return false;
  }

  function setStep(step) {
    elements.step1.classList.toggle("is-hidden", step !== 1);
    elements.step2.classList.toggle("is-hidden", step !== 2);
    elements.step3.classList.toggle("is-hidden", step !== 3);
    elements.stepIndicators.forEach((item, index) => {
      item.classList.toggle("is-active", index + 1 === step);
    });
  }

  async function loadPopular() {
    elements.popularList.innerHTML = '<p class="section-desc">인기 테마를 불러오는 중입니다.</p>';
    try {
      const themes = await fetchJson(`/themes/popular?limit=${POPULAR_LIMIT}`);
      if (!themes.length) {
        elements.popularList.innerHTML = '<p class="section-desc">아직 인기 테마가 없습니다.</p>';
        return;
      }
      elements.popularList.innerHTML = "";
      themes.forEach((theme) => {
        const card = document.createElement("article");
        card.className = "popular-card";
        const image = document.createElement("img");
        image.src = themeImageUrl(theme.url);
        image.alt = "";
        image.onerror = () => {
          image.src = placeholderImage;
        };
        const title = document.createElement("span");
        title.textContent = theme.name;
        card.append(image, title);
        elements.popularList.appendChild(card);
      });
    } catch (error) {
      elements.popularList.innerHTML = '<p class="section-desc message--err">인기 테마를 불러오지 못했습니다.</p>';
    }
  }

  async function loadThemes() {
    elements.themeGrid.innerHTML = '<p class="panel-hint">테마를 불러오는 중입니다.</p>';
    try {
      const themes = await fetchJson("/themes");
      state.themes = [...themes].sort((a, b) => a.name.localeCompare(b.name, "ko"));
      if (!state.themes.length) {
        elements.themeGrid.innerHTML = '<p class="panel-hint">등록된 테마가 없습니다.</p>';
        return;
      }

      elements.themeGrid.innerHTML = "";
      state.themes.forEach((theme) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "theme-card";
        button.addEventListener("click", () => selectTheme(theme));

        const image = document.createElement("img");
        image.src = themeImageUrl(theme.url);
        image.alt = "";
        image.onerror = () => {
          image.src = placeholderImage;
        };

        const body = document.createElement("div");
        body.className = "theme-card__body";
        const title = document.createElement("h3");
        title.className = "theme-card__title";
        title.textContent = theme.name;
        const desc = document.createElement("p");
        desc.className = "theme-card__desc";
        desc.textContent = theme.description || "";
        body.append(title, desc);
        button.append(image, body);
        elements.themeGrid.appendChild(button);
      });
    } catch (error) {
      elements.themeGrid.innerHTML = '<p class="panel-hint message--err">테마를 불러오지 못했습니다.</p>';
    }
  }

  async function collectAvailableDates(themeId) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dates = [];
    for (let i = 0; i < DATE_SCAN_DAYS; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(formatYmd(date));
    }

    const available = new Set();
    for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
      const chunk = dates.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(chunk.map(async (date) => {
        try {
          const slots = await fetchJson(`/themes/${themeId}/available-times?date=${date}`);
          return slots.length ? date : null;
        } catch {
          return null;
        }
      }));
      results.forEach((date) => {
        if (date) {
          available.add(date);
        }
      });
    }
    return available;
  }

  async function selectTheme(theme) {
    state.selectedTheme = theme;
    state.selectedDate = null;
    state.availableDates = new Set();
    state.calendarMonth = new Date();
    elements.selectedThemeName.textContent = theme.name;
    elements.calendarRoot.innerHTML = "";
    elements.calendarLoading.classList.remove("is-hidden");
    setStep(2);

    try {
      state.availableDates = await collectAvailableDates(theme.id);
      elements.calendarLoading.classList.add("is-hidden");
      renderCalendar();
    } catch (error) {
      elements.calendarLoading.classList.add("is-hidden");
      elements.calendarRoot.innerHTML = '<p class="message message--err">예약 가능 날짜를 불러오지 못했습니다.</p>';
    }
  }

  function renderCalendar() {
    const year = state.calendarMonth.getFullYear();
    const month = state.calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = (first.getDay() + 6) % 7;

    const header = document.createElement("div");
    header.className = "calendar__header";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn btn--ghost";
    prev.textContent = "이전";
    prev.addEventListener("click", () => {
      state.calendarMonth = new Date(year, month - 1, 1);
      renderCalendar();
    });

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn btn--ghost";
    next.textContent = "다음";
    next.addEventListener("click", () => {
      state.calendarMonth = new Date(year, month + 1, 1);
      renderCalendar();
    });

    const label = document.createElement("h3");
    label.className = "calendar__month-label";
    label.textContent = `${year}년 ${month + 1}월`;
    header.append(prev, label, next);

    const grid = document.createElement("div");
    grid.className = "calendar__grid";
    ["월", "화", "수", "목", "금", "토", "일"].forEach((day) => {
      const cell = document.createElement("div");
      cell.className = "calendar__dow";
      cell.textContent = day;
      grid.appendChild(cell);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < startPad; i += 1) {
      const empty = document.createElement("div");
      empty.className = "calendar__day is-empty";
      grid.appendChild(empty);
    }

    for (let day = 1; day <= last.getDate(); day += 1) {
      const cellDate = new Date(year, month, day);
      const dateText = formatYmd(cellDate);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar__day";
      button.textContent = String(day);
      button.disabled = cellDate < today || !state.availableDates.has(dateText);
      if (formatYmd(today) === dateText) {
        button.classList.add("is-today");
      }
      if (!button.disabled) {
        button.addEventListener("click", () => selectDate(dateText));
      }
      grid.appendChild(button);
    }

    elements.calendarRoot.innerHTML = "";
    elements.calendarRoot.append(header, grid);
  }

  async function selectDate(dateText) {
    state.selectedDate = dateText;
    elements.summaryTheme.textContent = state.selectedTheme.name;
    elements.summaryDate.textContent = dateText;
    elements.timeSelect.innerHTML = "";
    setMessage(elements.reserveMessage, "", true);
    setStep(3);

    try {
      const slots = await fetchJson(`/themes/${state.selectedTheme.id}/available-times?date=${dateText}`);
      if (!slots.length) {
        elements.timeSelect.disabled = true;
        setMessage(elements.reserveMessage, "선택한 날짜에 예약 가능한 시간이 없습니다.", false);
        return;
      }

      elements.timeSelect.disabled = false;
      slots.forEach((slot) => {
        const option = document.createElement("option");
        option.value = String(slot.id);
        option.textContent = formatTime(slot.startAt);
        elements.timeSelect.appendChild(option);
      });
    } catch (error) {
      elements.timeSelect.disabled = true;
      setMessage(elements.reserveMessage, "시간 목록을 불러오지 못했습니다.", false);
    }
  }

  async function createReservation(event) {
    event.preventDefault();
    if (!requireLogin(elements.reserveMessage) || !state.selectedTheme || !state.selectedDate) {
      return;
    }

    const timeId = Number(elements.timeSelect.value);
    if (!timeId) {
      return;
    }

    try {
      await fetchJson("/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          date: state.selectedDate,
          timeId,
          themeId: state.selectedTheme.id,
        }),
      });
      setMessage(elements.reserveMessage, "예약이 완료되었습니다.", true);
      await loadPopular();
      state.availableDates = await collectAvailableDates(state.selectedTheme.id);
      renderCalendar();
      setStep(2);
    } catch (error) {
      setMessage(elements.reserveMessage, error.message || "예약에 실패했습니다.", false);
    }
  }

  function showBooking() {
    elements.bookingSections.forEach((section) => section.classList.remove("is-hidden"));
    elements.mySection.classList.add("is-hidden");
    elements.navBooking.classList.add("active");
    elements.navMy.classList.remove("active");
  }

  async function showMyReservation() {
    if (!requireLogin(elements.mySearchMsg)) {
      return;
    }
    elements.bookingSections.forEach((section) => section.classList.add("is-hidden"));
    elements.mySection.classList.remove("is-hidden");
    elements.navMy.classList.add("active");
    elements.navBooking.classList.remove("active");
    await loadMyReservations();
  }

  function renderMyReservations(reservations) {
    elements.myResultArea.innerHTML = "";
    if (!reservations.length) {
      elements.myResultArea.innerHTML = '<p class="panel-hint">예약 내역이 없습니다.</p>';
      return;
    }

    reservations.forEach((reservation) => {
      const card = document.createElement("article");
      card.className = "my-card";
      const time = reservation.timeResponse;
      const theme = reservation.themeResponse;
      card.innerHTML = `
        <div class="my-card__badge">예약 확인</div>
        <div class="my-card__grid">
          <div class="my-card__field">
            <span class="my-card__label">예약자</span>
            <span class="my-card__value">${reservation.name}</span>
          </div>
          <div class="my-card__field">
            <span class="my-card__label">테마</span>
            <span class="my-card__value">${theme?.name || "-"}</span>
          </div>
          <div class="my-card__field">
            <span class="my-card__label">날짜</span>
            <span class="my-card__value">${reservation.date}</span>
          </div>
          <div class="my-card__field">
            <span class="my-card__label">시간</span>
            <span class="my-card__value">${formatTime(time?.startAt)}</span>
          </div>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "my-card__actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "btn my-btn-danger";
      cancelButton.textContent = "예약 취소";
      cancelButton.addEventListener("click", () => cancelReservation(reservation.id));
      actions.appendChild(cancelButton);
      card.appendChild(actions);
      elements.myResultArea.appendChild(card);
    });
  }

  async function loadMyReservations() {
    if (!isLoggedIn()) {
      return;
    }
    setMessage(elements.mySearchMsg, "예약을 불러오는 중입니다.", true);
    try {
      const reservations = await fetchJson("/reservations/my-reservation", {
        headers: authHeaders(),
      });
      renderMyReservations(reservations);
      setMessage(elements.mySearchMsg, "", true);
    } catch (error) {
      setMessage(elements.mySearchMsg, error.message || "예약 내역을 불러오지 못했습니다.", false);
    }
  }

  async function cancelReservation(id) {
    if (!confirm("예약을 취소하시겠습니까?")) {
      return;
    }
    try {
      await fetchJson(`/reservations/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setMessage(elements.mySearchMsg, "예약이 취소되었습니다.", true);
      await loadMyReservations();
      await loadPopular();
    } catch (error) {
      setMessage(elements.mySearchMsg, error.message || "예약 취소에 실패했습니다.", false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage(elements.authMessage, "", true);

    try {
      const response = await fetchJson("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: elements.loginEmail.value.trim(),
          password: elements.loginPassword.value,
        }),
      });
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(NAME_KEY, response.name);
      elements.loginForm.reset();
      applyAuthState();
      setMessage(elements.authMessage, "로그인되었습니다.", true);
    } catch (error) {
      setMessage(elements.authMessage, error.message || "로그인에 실패했습니다.", false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setMessage(elements.authMessage, "", true);

    try {
      const response = await fetchJson("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: elements.signupName.value.trim(),
          email: elements.signupEmail.value.trim(),
          password: elements.signupPassword.value,
        }),
      });
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(NAME_KEY, response.name);
      elements.signupForm.reset();
      applyAuthState();
      setMessage(elements.authMessage, "회원가입과 로그인이 완료되었습니다.", true);
    } catch (error) {
      setMessage(elements.authMessage, error.message || "회원가입에 실패했습니다.", false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    applyAuthState();
    showBooking();
    setMessage(elements.authMessage, "로그아웃되었습니다.", true);
  }

  elements.loginForm.addEventListener("submit", handleLogin);
  elements.signupForm.addEventListener("submit", handleSignup);
  elements.logoutButton.addEventListener("click", logout);
  elements.reserveForm.addEventListener("submit", createReservation);
  elements.btnBackThemes.addEventListener("click", () => {
    state.selectedTheme = null;
    state.selectedDate = null;
    setStep(1);
  });
  elements.btnBackCalendar.addEventListener("click", () => {
    state.selectedDate = null;
    setStep(2);
    renderCalendar();
  });
  elements.navBooking.addEventListener("click", (event) => {
    event.preventDefault();
    showBooking();
  });
  elements.navMy.addEventListener("click", (event) => {
    event.preventDefault();
    showMyReservation();
  });
  elements.myRefreshButton.addEventListener("click", loadMyReservations);

  applyAuthState();
  loadPopular();
  loadThemes();
})();
