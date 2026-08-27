/**
 * INCOIS 3D Ocean Data Visualization - Public Science Outreach & Story Mode Engine
 * Provides interactive educational journeys through Indian Ocean phenomena.
 */

class OutreachStoryEngine {
  constructor() {
    this.currentTourId = null;
    this.currentStepIndex = 0;

    this.tours = {
      thermocline_dive: {
        id: "thermocline_dive",
        title: "Dive Through Ocean Depth Layers",
        category: "Physical Oceanography",
        steps: [
          {
            heading: "The Ocean Surface (Epipelagic Sunlit Zone: 0 - 50m)",
            text: "Solar radiation warms the uppermost ocean layer to 28°C–30.5°C across the tropical Indian Ocean. Wind-driven mixing creates a homogeneous 'Mixed Layer' where light supports phytoplankton photosynthesis.",
            depth: 0,
            variable: "temperature",
            bookmark: "indian_ocean_overview",
            takeaway: "The top 30 meters stores more thermal energy than the entire Earth's atmosphere."
          },
          {
            heading: "The Thermocline Zone (70m - 200m)",
            text: "As we descend past 70m, temperature drops drastically from 28°C down to 14°C within a vertical span of just 100 meters. This sharp thermal gradient acts as a physical density barrier separating warm surface waters from the deep abyss.",
            depth: 100,
            variable: "temperature",
            bookmark: "arabian_sea",
            takeaway: "The depth of the 20°C isotherm (D20) is a key indicator for monsoon prediction and tropical cyclone heat potential."
          },
          {
            heading: "The Deep Abyssal Waters (500m - 2000m)",
            text: "Below 500 meters, darkness prevails and temperatures drop to 2.8°C–4.5°C with immense hydrostatic pressure (>200 atmospheres). These ancient water masses originated from polar regions and slowly circulate through the global conveyor belt.",
            depth: 1000,
            variable: "temperature",
            bookmark: "equatorial_jet",
            takeaway: "Deep ocean waters store enormous amounts of anthropogenic carbon dioxide over centuries."
          }
        ]
      },
      argo_profiling_cycle: {
        id: "argo_profiling_cycle",
        title: "Follow an Argo Float's 10-Day Journey",
        category: "Ocean Observation",
        steps: [
          {
            heading: "Step 1: Surface Satellite Data Transmission",
            text: "The buoyant Argo float surfaces and transmits temperature, salinity, and biogeochemical profiles via Iridium satellites to INCOIS data servers in Hyderabad, India.",
            depth: 0,
            variable: "temperature",
            bookmark: "arabian_sea",
            float_id: "2902145",
            takeaway: "Data is validated by INCOIS operational oceanographers and published within 2 hours."
          },
          {
            heading: "Step 2: Descent & Neutral Drift at 1000m",
            text: "The float pumps oil from its external bladder into its internal reservoir, reducing its volume and increasing its density. It sinks to its 'parking depth' of 1000 meters, drifting passively with deep ocean currents for 9 days.",
            depth: 1000,
            variable: "salinity",
            bookmark: "arabian_sea",
            takeaway: "Over 4,000 active Argo floats drift across world oceans today."
          },
          {
            heading: "Step 3: Deep Dive to 2000m & Ascending CTD Cast",
            text: "On the 10th day, the float descends to 2000 meters before starting its ascent, collecting continuous high-precision CTD (Conductivity, Temperature, Depth) measurements as it rises back to the surface.",
            depth: 0,
            variable: "temperature",
            bookmark: "arabian_sea",
            takeaway: "Argo profiles provide the ground-truth observations used to validate numerical ocean forecast models."
          }
        ]
      },
      monsoon_somali_current: {
        id: "monsoon_somali_current",
        title: "Monsoon Currents & Arabian Sea Upwelling",
        category: "Ocean Dynamics & Climate",
        steps: [
          {
            heading: "Summer Southwest Monsoon Jet",
            text: "During the Summer Monsoon (June–September), strong southwesterly winds blow over the Arabian Sea, driving the intense Somali Current along the coast of Africa at speeds exceeding 2.0 m/s (4 knots).",
            depth: 0,
            variable: "current_speed",
            bookmark: "somali_jet",
            takeaway: "The Indian Ocean is unique as its surface currents completely reverse direction twice a year."
          },
          {
            heading: "Coastal Upwelling & Phytoplankton Blooms",
            text: "Ekman transport pushes surface water offshore, drawing cold, nutrient-rich deep water to the surface along the coast of Kerala and Oman. This upwelling fuels massive phytoplankton blooms visible in chlorophyll.",
            depth: 0,
            variable: "chlorophyll",
            bookmark: "arabian_sea",
            takeaway: "Upwelling zones sustain India's rich pelagic fisheries and marine biodiversity."
          }
        ]
      },
      bay_of_bengal_freshwater: {
        id: "bay_of_bengal_freshwater",
        title: "Bay of Bengal Fresh Water Tongue",
        category: "Salinity & Cyclones",
        steps: [
          {
            heading: "River Runoff & Low Salinity Pool",
            text: "Massive freshwater discharge from the Ganges, Brahmaputra, and Godavari rivers empties over 1.6 trillion cubic meters of water into the northern Bay of Bengal, reducing surface salinity to ~31 PSU (compared to 36.5 PSU in the Arabian Sea).",
            depth: 0,
            variable: "salinity",
            bookmark: "bay_of_bengal",
            takeaway: "This creates a strong vertical salinity stratification known as the 'Barrier Layer'."
          },
          {
            heading: "Cyclone Heat Trapping",
            text: "The shallow barrier layer prevents deep cold water from mixing upward. This traps solar heat in the upper 30m, enabling sea surface temperatures to exceed 29°C and fueling rapid intensification of tropical cyclones.",
            depth: 25,
            variable: "temperature",
            bookmark: "bay_of_bengal",
            takeaway: "INCOIS uses 3D model salinity profiles to generate accurate cyclone intensity advisories."
          }
        ]
      }
    };
  }

  startTour(tourId) {
    const tour = this.tours[tourId];
    if (!tour) return;

    this.currentTourId = tourId;
    this.currentStepIndex = 0;
    this.renderStepModal(tour);
  }

  renderStepModal(tour) {
    const step = tour.steps[this.currentStepIndex];
    const totalSteps = tour.steps.length;

    // Apply scientific parameters to the 3D application
    if (window.app) {
      if (step.variable) window.app.setVariable(step.variable);
      if (step.depth !== undefined) window.app.setDepth(step.depth);
      if (step.bookmark && window.oceanScene) window.oceanScene.flyToBookmark(step.bookmark);
      if (step.float_id && window.app.selectObservationById) window.app.selectObservationById(step.float_id);
    }

    const modalBody = document.getElementById('outreach-modal-content');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="story-tour-card">
        <div class="story-step-badge">${tour.category} • Step ${this.currentStepIndex + 1} of ${totalSteps}</div>
        <h3 class="story-heading">${step.heading}</h3>
        <p class="story-body-text">${step.text}</p>
        <div class="story-key-takeaway">
          <strong>Key Ocean Insight:</strong> ${step.takeaway}
        </div>
      </div>
    `;

    const prevBtn = document.getElementById('outreach-prev-btn');
    const nextBtn = document.getElementById('outreach-next-btn');

    if (prevBtn) prevBtn.disabled = (this.currentStepIndex === 0);
    if (nextBtn) nextBtn.textContent = (this.currentStepIndex === totalSteps - 1) ? "Complete Journey" : "Next Step →";

    const modal = document.getElementById('outreach-modal');
    if (modal) modal.classList.add('open');
  }

  nextStep() {
    const tour = this.tours[this.currentTourId];
    if (!tour) return;

    if (this.currentStepIndex < tour.steps.length - 1) {
      this.currentStepIndex++;
      this.renderStepModal(tour);
    } else {
      this.closeModal();
    }
  }

  prevStep() {
    const tour = this.tours[this.currentTourId];
    if (!tour) return;

    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.renderStepModal(tour);
    }
  }

  closeModal() {
    const modal = document.getElementById('outreach-modal');
    if (modal) modal.classList.remove('open');
    this.currentTourId = null;
  }
}

window.outreachStoryEngine = new OutreachStoryEngine();
