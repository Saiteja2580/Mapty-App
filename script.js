const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

//selecting all necesssary variables
const form = document.querySelector(".form");
const listContainer = document.querySelector(".sidebar--workout--list");
const inputType = document.querySelector(".input-type");
const inputDistance = document.querySelector(".input-distance");
const inputDuration = document.querySelector(".input-duration");
const inputCadence = document.querySelector(".input-cadence");
//const cadenceContainer = document.querySelector(".form-input-cadence");
const inputElevation = document.querySelector(".input-elevation");
//const elevationContainer = document.querySelector(".form-input-elevation");
const mapContainer = document.querySelector(".app--map--container");

class App {
  #map;
  #mapEvent;
  #workout = [];
  #mapZoomLevel;

  constructor() {
    this.getPosition();
    this.#mapZoomLevel = 13;
    form.addEventListener("submit", this.newWorkout.bind(this));
    inputType.addEventListener("change", this.toggleElevation.bind(this));
    listContainer.addEventListener("click", this.moveToMarker.bind(this));

    this.getLocalStorage();

    //console.log(this.#workout);
  }

  getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => this.loadMap(position),
        function () {
          alert("couldnt get the current coordinates");
        }
      );
    }
  }

  loadMap(position) {
    const { latitude, longitude } = position.coords;
    //console.log(position);

    const coord = [latitude, longitude];

    // Check if the container exists
    if (mapContainer) {
      this.#map = L.map(mapContainer).setView(coord, this.#mapZoomLevel);
      console.log(this.#map);

      L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);

      // L.marker(coords).addTo(this.#map).bindPopup("popupStrng").openPopup();

      this.#map.on("click", this.showForm.bind(this));

      this.#workout.forEach((work) => {
        work.date = new Date(work.date);

        this.renderWorkoutInList(work);
        this.renderWorkoutMarker(work);
      });
    }
  }

  showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  toggleElevation() {
    inputElevation.closest(".form-input-elevation").classList.toggle("hidden");
    inputCadence.closest(".form-input-cadence").classList.toggle("hidden");
  }

  newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const inputPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    //console.log(this.#mapEvent);

    const { lat, lng } = this.#mapEvent.latlng;
    const coordsPresent = [lat, lng];
    //getting the form details and create object based on cycling and running
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    if (type === "Running") {
      const cadence = +inputCadence.value;
      console.log(cadence);

      if (
        !validInputs(distance, duration, cadence) ||
        !inputPositive(distance, duration, cadence)
      ) {
        return alert("Inputs should be number");
      }
      workout = new Running(coordsPresent, distance, duration, cadence);
    }
    if (type === "Cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !inputPositive(distance, duration)
      ) {
        return alert("Inputs should be number");
      }
      workout = new Cycling(coordsPresent, distance, duration, elevation);
    }
    this.#workout.push(workout);
    //console.log(this.#workout);
    this.renderWorkoutMarker(workout, coordsPresent);
    form.reset();

    form.classList.add("hidden");
    this.renderWorkoutInList(workout);

    this.setLocalStorage();
  }

  renderWorkoutMarker(workout) {
    console.log(workout.coords, this.#map);

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `popup-${workout.type}`,
        })
      )
      .setPopupContent(this.getString(workout))
      .openPopup();
  }

  getString(workout) {
    let str;
    if (workout.type === "Running") {
      str = `🏃‍♂️ Running on ${
        monthNames[workout.date.getMonth()]
      } ${workout.date.getDate()}`;
    }
    if (workout.type === "Cycling") {
      str = `🚴 Cycling on ${
        monthNames[workout.date.getMonth()]
      } ${workout.date.getDate()}`;
    }
    return str;
  }

  renderWorkoutInList(workout) {
    let html = ``;
    console.log(workout);

    if (workout.type === "Running") {
      html = `
       <div class="app-present-workout-running workout" data-id="${workout.id}">
                <div class="present-date">${this.getString(workout)}</div>
                <div class="present-details">
                  <div>🏃<span>${workout.distance} KM</span></div>
                  <div>🕛<span>${workout.duration} MIN</span></div>
                  <div>⚡<span>${workout.cadence} MIN/KM</span></div>
                  <div>🦶<span>${workout.pace} SPM</span></div>
                </div>
              </div>
    `;
    }
    if (workout.type === "Cycling") {
      html = `
       <div class="app-present-workout-cycling workout" data-id="${workout.id}">
                <div class="present-date">${this.getString(workout)}</div>
                <div class="present-details">
                  <div>🚴<span>${workout.distance} KM</span></div>
                  <div>🕛<span>${workout.duration} MIN</span></div>
                  <div>⚡<span>${workout.elevationGain} MIN/KM</span></div>
                  <div>🦶<span>${workout.speed} m</span></div>
                </div>
              </div>
    `;
    }

    listContainer.insertAdjacentHTML("afterbegin", html);
  }
  moveToMarker(e) {
    const workout = e.target.closest(".workout");
    //console.log(workout);

    if (!workout) {
      return;
    }

    const curWorkout = this.#workout.find(
      (act) => workout.getAttribute("data-id") === act.id
    );

    const coords = curWorkout.coords;
    console.log(coords);

    this.#map.setView(curWorkout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    curWorkout.click();
  }

  setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workout));
  }

  getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (data) {
      this.#workout = data.map((work) =>
        work.type === "Running"
          ? new Running(work.coords, work.distance, work.duration, work.cadence)
          : new Cycling(
              work.coords,
              work.distance,
              work.duration,
              work.elevationGain
            )
      );
    }
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

class Workout {
  date = new Date();
  clicks = 0;
  id = (Date.now() + "").slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  click() {
    this.clicks++;
    console.log(this.clicks);
  }
}

class Running extends Workout {
  type = "Running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "Cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }

  calcSpeed() {
    //min/km
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const app = new App();

// const run = new Running([30, 12], 5, 2, 24, 170);
// console.log(run);
