// login form handling //
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success) {
            // Hide login screen //
            document.getElementById('login-screen').style.display = 'none';
            window.currentUser = data.user;
            // Show correct dashboard //
            if (data.user.role === 'manager') {
              loadEmployeeAvailability();
                document.getElementById('manager-dashboard').style.display = 'grid';
            } else {
                document.getElementById('employee-dashboard').style.display = 'grid';
            }

            // Load employee shift requests if employee //
            if (data.user.role === 'employee') {
                loadEmployeeShiftRequests();
                loadEmployeeWeeklyShifts();
            }

        } else {
            alert('Login failed: ' + (data.message || 'Invalid credentials'));
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Error logging in');
    }
});



// calendar //
const selects = document.querySelectorAll(".schedule select");
const shifts = ["morning", "afternoon", "evening"];
let currentWeekStart = getMonday(new Date());

// pull employee data //
let employees = [];
async function loadEmployees() {
  try {
    const res = await fetch("http://localhost:3000/api/employees");
    const data = await res.json();
    employees = data; 
    populateEmployees(); 
  } catch (err) {
    console.error("Failed to load employees:", err);
  }
}

// get monday //
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// get 7 days //
function getWeekDates(startDate) {
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  return days;
}

// assign dates and shifts //
function assignDatesToGrid(startDate) {
  const days = getWeekDates(startDate);

  selects.forEach((select, index) => {
    const dayIndex = index % 7;
    const shiftIndex = Math.floor(index / 7);
    const date = days[dayIndex];
    const shift = shifts[shiftIndex];
    const dateStr = date.toISOString().split("T")[0];
    select.dataset.date = dateStr;
    select.dataset.shift = shift;
  });

  updateHeader(days);

  // Update main schedule title with week range //
const scheduleTitle = document.getElementById('schedule-title-date');
const options = { day: 'numeric', month: 'short', year: 'numeric' };
const weekStart = days[0];
const weekEnd = days[6];
scheduleTitle.textContent = `${weekStart.toLocaleDateString('en-GB', options)} - ${weekEnd.toLocaleDateString('en-GB', options)}`
}

// update top row with dates //
function updateHeader(days) {
  const headers = document.querySelectorAll(".schedule .header");

  headers.forEach((el, i) => {
    if (i === 0) return;
    const date = days[i - 1];

    el.textContent = date.toLocaleDateString("en-CA", {
      weekday: "short",
      day: "numeric"
    });
  });
}

// fill dropdowns //
function populateEmployees() {
  selects.forEach(select => {
    select.innerHTML = `<option value="">-- Select --</option>`;

    employees.forEach(emp => {
      const option = document.createElement("option");
      option.value = emp.id;        
      option.textContent = emp.first_name; 
      select.appendChild(option);
    });
  });
}


// load shifts for the week //
async function loadShifts(startDate) {
  const days = getWeekDates(startDate);
  const start = days[0].toLocaleDateString("en-CA");
  const end = days[6].toLocaleDateString("en-CA");

  try {
    const res = await fetch(
      `http://localhost:3000/api/shifts?start=${start}&end=${end}`
    );
    const shiftsData = await res.json();
    

    // Clear all selects //
    selects.forEach(select => {
      select.value = "";
    });

    // Fill in saved shifts //
    shiftsData.forEach(shift => {

  const dbDate = shift.shift_date; 

  const match = Array.from(selects).find(select =>
    select.dataset.date === dbDate &&
    select.dataset.shift === shift.shift_type
  );

  if (match) {
    const optionExists = Array.from(match.options).some(
      opt => opt.value === String(shift.employee_id)
    );

    if (optionExists) {
      match.value = String(shift.employee_id);
    }
  }
});

  } catch (err) {
    console.error("Failed to load shifts:", err);
  }
}


// post shifts to backend //
document.querySelector(".schedule").addEventListener("change", async (e) => {
  if (e.target.tagName === "SELECT") {
    const rawDate = e.target.dataset.date;
    const cleanDate = rawDate;
    const shift = e.target.dataset.shift;
    const employee = e.target.value;

    

    try {
      const res = await fetch("http://localhost:3000/api/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: cleanDate,
          shift,
          employee
        })
      });
      const data = await res.json();   
    } catch (err) {
      console.error("Error:", err);
    }
  }
});


// navigation //
const controls = document.createElement("div");
controls.innerHTML = `
  <button id="prev-week">← Previous</button>
  <button id="next-week">Next →</button>
`;

document.querySelector("#schedule-view article").prepend(controls);

document.getElementById("prev-week").onclick = async () => {
  currentWeekStart = new Date(currentWeekStart);
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);

  assignDatesToGrid(currentWeekStart);
  await loadShifts(currentWeekStart);
};

document.getElementById("next-week").onclick = async () => {
  currentWeekStart = new Date(currentWeekStart);
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);

  assignDatesToGrid(currentWeekStart);
  await loadShifts(currentWeekStart);
};


assignDatesToGrid(currentWeekStart);
loadEmployees().then(() => {
  loadShifts(currentWeekStart);
});


// auto-allocate //
document.getElementById('auto-allocate').addEventListener('click', async () => {
    const start = currentWeekStart.toISOString().split('T')[0];
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const end = endDate.toISOString().split('T')[0];

    try {
        const res = await fetch('http://localhost:3000/auto-allocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, end })
        });

        const data = await res.json();        
        await loadShifts(currentWeekStart); 
    } catch (err) {
        console.error('Error auto-allocating:', err);
        alert('Auto-allocation failed.');
    }
});


// date-selector //
const dateInput = document.getElementById('schedule-date');
dateInput.value = currentWeekStart.toISOString().split('T')[0];

dateInput.addEventListener('change', async (e) => {
    const selectedDate = e.target.value;
    if (!selectedDate) return;
    currentWeekStart = getMonday(new Date(selectedDate)); 
    assignDatesToGrid(currentWeekStart);               
    await loadShifts(currentWeekStart);
    loadEmployeeWeeklyShifts();                
});

document.getElementById('prev-week').onclick = async () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    assignDatesToGrid(currentWeekStart);
    await loadShifts(currentWeekStart);
    dateInput.value = currentWeekStart.toISOString().split('T')[0];
    loadEmployeeWeeklyShifts();
};

document.getElementById('next-week').onclick = async () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    assignDatesToGrid(currentWeekStart);
    await loadShifts(currentWeekStart);
    dateInput.value = currentWeekStart.toISOString().split('T')[0];
    loadEmployeeWeeklyShifts();
};



// employee availability //
let employeeAvailability = [];
const availabilityList = document.getElementById('availability-list');
const addAvailabilityBtn = document.getElementById('add-availability');
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const shiftTimes = ['morning', 'afternoon', 'evening'];

addAvailabilityBtn.addEventListener('click', () => {
    
    const entry = document.createElement('div');
    entry.className = 'availability-entry';

    
    const daySelect = document.createElement('select');
    weekdays.forEach(day => {
        const opt = document.createElement('option');
        opt.value = day;
        opt.textContent = day;
        daySelect.appendChild(opt);
    });
    
    const shiftSelect = document.createElement('select');
    shiftTimes.forEach(shift => {
        const opt = document.createElement('option');
        opt.value = shift;
        opt.textContent = shift.charAt(0).toUpperCase() + shift.slice(1);
        shiftSelect.appendChild(opt);
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
        availabilityList.removeChild(entry);        
        employeeAvailability = employeeAvailability.filter(e => e.element !== entry);
    });
    
    entry.appendChild(daySelect);
    entry.appendChild(shiftSelect);
    entry.appendChild(removeBtn);    
    availabilityList.appendChild(entry);    
    employeeAvailability.push({ element: entry, weekday: daySelect.value, shift: shiftSelect.value });

    daySelect.addEventListener('change', () => {
        const item = employeeAvailability.find(e => e.element === entry);
        if (item) item.weekday = daySelect.value;
    });
    shiftSelect.addEventListener('change', () => {
        const item = employeeAvailability.find(e => e.element === entry);
        if (item) item.shift = shiftSelect.value;
    });
});

// save availability //
document.getElementById('save-availability').addEventListener('click', async () => {
    const unavailableToSave = employeeAvailability.map(a => ({
        weekday: a.weekday,
        shift: a.shift
    }));

    try {
        const res = await fetch('http://localhost:3000/api/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employeeId: window.currentUser.id,
                unavailable: unavailableToSave
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('Unavailable shifts saved!');
        } else {
            alert('Failed to save unavailable shifts');
        }
    } catch(err) {
        console.error(err);
        alert('Error saving unavailable shifts');
    }
});



// change requests //
document.getElementById('shift-request-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const shiftDate = document.getElementById('shift-date').value;
    const shiftType = document.getElementById('shift-type').value;
    const requestType = document.getElementById('request-type').value;

    try {
        const res = await fetch('http://localhost:3000/api/shift-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employeeId: window.currentUser.id,
                shift_date: shiftDate,
                shift_type: shiftType,
                request_type: requestType
            })
        });

        const data = await res.json();
        loadEmployeeShiftRequests();

    } catch (err) {
        console.error(err);
        alert('Error submitting request');
    }
});

// manager dashboard - fetch and display pending shift requests //
async function loadShiftRequests() {
    const tbody = document.querySelector('#shift-requests-table tbody');
    tbody.innerHTML = ''; 

    try {
        const res = await fetch('http://localhost:3000/api/shift-requests');
        const requests = await res.json();

        requests.forEach(req => {
            const dateObj = new Date(req.shift_date);
            const formattedDate = dateObj.toLocaleDateString('en-GB'); 

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${req.first_name}</td>
                <td>${formattedDate}</td>
                <td>${req.shift_type}</td>
                <td>${req.request_type}</td>
                <td>
                    <button class="approve-request" data-id="${req.id}">Approve</button>
                    <button class="deny-request" data-id="${req.id}">Deny</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error loading shift requests:', err);
    }
}


// manager dashboard - approve/deny change //
async function handleShiftRequestAction(requestId, action) {
    try {
        const res = await fetch(`http://localhost:3000/api/shift-request/${requestId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, managerId: window.currentUser.id })
        });

        const data = await res.json();   
        loadShiftRequests();

    } catch (err) {
        console.error('Error processing request:', err);
        alert('Error processing request');
    }
}


if (window.location.hash === '#change-requests' || document.getElementById('manager-dashboard')) {
    loadShiftRequests();
}


// employee dashboard - fetch and display employee's shift requests //
async function loadEmployeeShiftRequests() {
    const tbody = document.querySelector('#employee-requests-table tbody');
    tbody.innerHTML = '';

    if (!window.currentUser?.id) return;

    try {
        const res = await fetch(`http://localhost:3000/api/employee/shift-requests/${window.currentUser.id}`);
        const data = await res.json();

        if (!data.success || data.requests.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" style="text-align:center">No shift requests found</td>`;
            tbody.appendChild(tr);
            return;
        }

        data.requests.forEach(req => {
            const dateObj = new Date(req.shift_date);
            const formattedDate = dateObj.toLocaleDateString('en-GB');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formattedDate}</td>
                <td>${req.shift_type.charAt(0).toUpperCase() + req.shift_type.slice(1)}</td>
                <td>${req.request_type.charAt(0).toUpperCase() + req.request_type.slice(1)}</td>
                <td>${req.status.charAt(0).toUpperCase() + req.status.slice(1)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error loading employee shift requests:', err);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" style="text-align:center;color:red">Error loading requests</td>`;
        tbody.appendChild(tr);
    }
}


document.querySelector('#shift-requests-table tbody').addEventListener('click', async (e) => {    
    if (!e.target.classList.contains('approve-request') && !e.target.classList.contains('deny-request')) return;

    const action = e.target.classList.contains('approve-request') ? 'approved' : 'denied';
    const requestId = e.target.dataset.id;

    try {
        
        const res = await fetch(`http://localhost:3000/api/shift-request/${requestId}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action, managerId: window.currentUser.id })
        });

        const data = await res.json();

        if (data.success) {                       
            loadShiftRequests();            
            if (window.currentUser?.role === 'employee' &&
                window.currentUser.employeeId === data.updatedRequest.employee_id) {
                loadEmployeeShiftRequests();
            }
        } else {
            alert('Failed to update request.');
        }

    } catch (err) {
        console.error('Error processing shift request:', err);        
    }
});


if (window.currentUser?.role === 'employee') {
    loadEmployeeShiftRequests();
    loadEmployeeWeeklyShifts();
}


// manager dashboard -employee availability //
async function loadEmployeeAvailability() {
    const container = document.getElementById('manager-availability-grid');
    container.innerHTML = ''; 
    
    const employees = await fetch('http://localhost:3000/api/employees').then(r => r.json());
    const unavailabilities = await fetch('http://localhost:3000/api/availability').then(r => r.json());

    const weekDates = getWeekDates(currentWeekStart);
    const shiftTypes = ['morning', 'afternoon', 'evening'];

    const table = document.createElement('table');
    table.classList.add('manager-availability-table');
    
    const header = document.createElement('tr');
    header.innerHTML = `<th>Employee</th>` +
        weekDates.map(d => `<th>${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</th>`).join('');
    table.appendChild(header);
    
    employees.forEach(emp => {
        const tr = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = emp.first_name;
        tr.appendChild(nameCell);

        weekDates.forEach(date => {
            const td = document.createElement('td');
            
            const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
            const unavailableShifts = unavailabilities.filter(u =>
                u.employee_id === emp.id &&
                u.weekday === weekday
            );

            if (unavailableShifts.length > 0) {
                td.textContent = 'Unavailable';
                td.classList.add('unavailable'); 
            } else {
                td.textContent = ''; 
            }

            tr.appendChild(td);
        });

        table.appendChild(tr);
    });
    container.appendChild(table);
}

// employee dashboard - load weekly shifts  //
async function loadEmployeeWeeklyShifts() {
    if (!window.currentUser?.id) return;

    const container = document.getElementById('employee-schedule-grid');
    container.innerHTML = '';

    const weekDates = getWeekDates(currentWeekStart);
    const shiftTypes = ['morning', 'afternoon', 'evening'];

    try {
        const res = await fetch(`http://localhost:3000/api/shifts?start=${weekDates[0].toISOString().split('T')[0]}&end=${weekDates[6].toISOString().split('T')[0]}&employee=${window.currentUser.id}`);
        const shiftsData = await res.json();

        // Header row
        const headerRow = document.createElement('div');
        headerRow.classList.add('employee-schedule-header');
        headerRow.innerHTML = `<div class="cell-time-label"></div>` + weekDates.map(d =>
            `<div class="cell-header">${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</div>`).join('');
        container.appendChild(headerRow);

        // Rows for each shift type
        shiftTypes.forEach(shiftType => {
            const row = document.createElement('div');
            row.classList.add('employee-schedule-row');

            // Time label
            const label = document.createElement('div');
            label.classList.add('cell-time-label');
            label.textContent = shiftType.charAt(0).toUpperCase() + shiftType.slice(1);
            row.appendChild(label);

            // Cells for each day
            weekDates.forEach(date => {
                const cell = document.createElement('div');
                cell.classList.add('cell');

                const shift = shiftsData.find(s =>
                    s.shift_type.toLowerCase() === shiftType &&
                    s.shift_date === date.toISOString().split('T')[0]);

                if (shift) {
                    cell.textContent = shift.employee_name;
                    cell.classList.add('assigned');
                }

                row.appendChild(cell);
            });

            container.appendChild(row);
        });

    } catch (err) {
        console.error('Error loading employee weekly shifts:', err);
        container.innerHTML = '<p style="color:red">Failed to load schedule</p>';
    }
}

// logout //
// Employee logout
const employeeLogout = document.getElementById('employee-logout');
employeeLogout?.addEventListener('click', () => {
    document.getElementById('employee-dashboard').style.display = 'none';
    document.getElementById('manager-dashboard').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    window.currentUser = null; 
});

// Manager logout
const managerLogout = document.getElementById('manager-logout');
managerLogout?.addEventListener('click', () => {
    document.getElementById('employee-dashboard').style.display = 'none';
    document.getElementById('manager-dashboard').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    window.currentUser = null;
});