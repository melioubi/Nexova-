(function () {
  'use strict';

  const form = document.getElementById('formulario-talento');
  if (!form) return;

  const successMessage = document.getElementById('mensaje-exito');
  const commentsField = document.getElementById('comentarios-adicionales');
  const charCounter = document.getElementById('contador-comentarios');
  const resetButton = document.getElementById('btn-limpiar');

  const ERROR_MESSAGES = {
    'nombre-completo': 'El nombre debe contener al menos nombre y apellido',
    'correo-electronico': 'Ingresa un email válido (ejemplo: nombre@empresa.com)',
    telefono: 'El teléfono debe incluir código de país (ejemplo: +34 612 345 678)',
    'pais-residencia': 'Selecciona tu país de residencia',
    'anos-experiencia': 'Los años de experiencia deben estar entre 0 y 50',
    'sector-interes': 'Selecciona el sector de tu interés',
    'nivel-ingles': 'Indica tu nivel de inglés',
    disponibilidad: 'Selecciona tu disponibilidad',
    'linkedin-url': 'Si incluye LinkedIn, debe ser una URL válida',
    'acepto-politica-datos': 'Debes aceptar la política de tratamiento de datos para continuar',
  };

  const FIELD_IDS = [
    'nombre-completo',
    'correo-electronico',
    'telefono',
    'pais-residencia',
    'anos-experiencia',
    'sector-interes',
    'nivel-ingles',
    'disponibilidad',
    'linkedin-url',
    'comentarios-adicionales',
    'acepto-politica-datos',
  ];

  function getErrorElement(fieldId) {
    return document.getElementById('error-' + fieldId);
  }

  function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = getErrorElement(fieldId);

    if (field) {
      field.setAttribute('aria-invalid', 'true');
      if (fieldId === 'disponibilidad') {
        field.classList.add('ring-2', 'ring-red-500', 'rounded-lg', 'p-2');
      } else {
        field.classList.add('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
        field.classList.remove('border-slate-300', 'focus:ring-nexova-500', 'focus:border-nexova-500');
      }
    }

    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorEl = getErrorElement(fieldId);

    if (field) {
      field.setAttribute('aria-invalid', 'false');
      if (fieldId === 'disponibilidad') {
        field.classList.remove('ring-2', 'ring-red-500', 'rounded-lg', 'p-2');
      } else {
        field.classList.remove('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
        field.classList.add('border-slate-300', 'focus:ring-nexova-500', 'focus:border-nexova-500');
      }
    }

    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }

  function validateFullName(value) {
    const trimmed = value.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    return words.length >= 2;
  }

  function validateEmail(value) {
    const trimmed = value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  }

  function validatePhone(value) {
    const trimmed = value.trim();
    const phoneRegex = /^\+\d{1,3}(\s\d+)+$/;
    return phoneRegex.test(trimmed);
  }

  function validateExperience(value) {
    if (value === '' || value === null || value === undefined) return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 && num <= 50;
  }

  function validateSelect(value) {
    return value.trim() !== '';
  }

  function validateAvailability() {
    const selected = form.querySelector('input[name="disponibilidad"]:checked');
    return selected !== null;
  }

  function validateLinkedIn(value) {
    const trimmed = value.trim();
    if (trimmed === '') return true;
    return /^https?:\/\/.+/i.test(trimmed);
  }

  function validateComments(value) {
    return value.length <= 500;
  }

  function getCommentsErrorMessage(value) {
    const remaining = 500 - value.length;
    return 'Los comentarios no pueden exceder los 500 caracteres (quedan ' + remaining + ')';
  }

  function validateCheckbox(checked) {
    return checked;
  }

  function validateField(fieldId) {
    switch (fieldId) {
      case 'nombre-completo': {
        const field = document.getElementById(fieldId);
        const valid = validateFullName(field.value);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'correo-electronico': {
        const field = document.getElementById(fieldId);
        const valid = validateEmail(field.value);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'telefono': {
        const field = document.getElementById(fieldId);
        const valid = validatePhone(field.value);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'pais-residencia': {
        const field = document.getElementById(fieldId);
        const valid = validateSelect(field.value);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'anos-experiencia': {
        const field = document.getElementById(fieldId);
        const valid = validateExperience(field.value);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'sector-interes': {
        const field = document.getElementById(fieldId);
        const valid = validateSelect(field.value);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'nivel-ingles': {
        const field = document.getElementById(fieldId);
        const valid = validateSelect(field.value);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'disponibilidad': {
        const valid = validateAvailability();
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'linkedin-url': {
        const field = document.getElementById(fieldId);
        const valid = validateLinkedIn(field.value);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      case 'comentarios-adicionales': {
        const field = document.getElementById(fieldId);
        const valid = validateComments(field.value);
        if (!valid) showError(fieldId, getCommentsErrorMessage(field.value));
        else clearError(fieldId);
        return valid;
      }
      case 'acepto-politica-datos': {
        const field = document.getElementById(fieldId);
        const valid = validateCheckbox(field.checked);
        if (!valid) showError(fieldId, ERROR_MESSAGES[fieldId]);
        else clearError(fieldId);
        return valid;
      }
      default:
        return true;
    }
  }

  function validateForm() {
    return FIELD_IDS.every(function (fieldId) {
      return validateField(fieldId);
    });
  }

  function updateCharCounter() {
    if (!commentsField || !charCounter) return;
    const length = commentsField.value.length;
    charCounter.textContent = length + ' / 500 caracteres';
    if (length > 500) {
      charCounter.classList.add('text-red-600', 'font-medium');
      charCounter.classList.remove('text-slate-500');
    } else {
      charCounter.classList.remove('text-red-600', 'font-medium');
      charCounter.classList.add('text-slate-500');
    }
  }

  function hideSuccessMessage() {
    if (successMessage) {
      successMessage.classList.add('hidden');
    }
  }

  function showSuccessMessage() {
    if (successMessage) {
      successMessage.classList.remove('hidden');
      successMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function resetFormState() {
    FIELD_IDS.forEach(clearError);
    hideSuccessMessage();
    updateCharCounter();
  }

  FIELD_IDS.forEach(function (fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    if (fieldId === 'disponibilidad') {
      const radios = form.querySelectorAll('input[name="disponibilidad"]');
      radios.forEach(function (radio) {
        radio.addEventListener('change', function () {
          validateField('disponibilidad');
        });
        radio.addEventListener('blur', function () {
          validateField('disponibilidad');
        });
      });
      return;
    }

    if (fieldId === 'comentarios-adicionales') {
      field.addEventListener('input', function () {
        updateCharCounter();
        if (field.value.length > 500) {
          showError(fieldId, getCommentsErrorMessage(field.value));
        } else {
          clearError(fieldId);
        }
      });
      field.addEventListener('blur', function () {
        validateField(fieldId);
      });
      return;
    }

    if (field.type === 'checkbox') {
      field.addEventListener('change', function () {
        validateField(fieldId);
      });
      return;
    }

    field.addEventListener('blur', function () {
      validateField(fieldId);
    });

    if (field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'url' || field.type === 'number') {
      field.addEventListener('input', function () {
        validateField(fieldId);
      });
    }

    if (field.tagName === 'SELECT') {
      field.addEventListener('change', function () {
        validateField(fieldId);
      });
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    hideSuccessMessage();

    if (validateForm()) {
      showSuccessMessage();
      form.reset();
      resetFormState();
    } else {
      const firstInvalid = FIELD_IDS.find(function (fieldId) {
        return !validateField(fieldId);
      });
      if (firstInvalid) {
        const el = document.getElementById(firstInvalid);
        if (firstInvalid === 'disponibilidad') {
          const firstRadio = form.querySelector('input[name="disponibilidad"]');
          if (firstRadio) firstRadio.focus();
        } else if (el && el.focus) {
          el.focus();
        }
      }
    }
  });

  if (resetButton) {
    resetButton.addEventListener('click', function () {
      setTimeout(resetFormState, 0);
    });
  }

  updateCharCounter();
})();
