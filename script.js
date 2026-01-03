// Global variables
const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
let uploadedPhotoData = '';
let isMinor = false;
let blockedField = null;

// Set max date for DOB to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('dob').setAttribute('max', today);

// Location data
const locations = {
    'India': { 'Karnataka': ['Bangalore', 'Mysore'], 'Maharashtra': ['Mumbai', 'Pune'], 'Delhi': ['New Delhi', 'Central Delhi'] },
    'USA': { 'California': ['Los Angeles', 'San Francisco'], 'Texas': ['Houston', 'Dallas'], 'New York': ['New York City', 'Buffalo'] },
    'UK': { 'England': ['London', 'Manchester'], 'Scotland': ['Edinburgh', 'Glasgow'] }
};

const postalCodes = {
    '560001': { country: 'India', state: 'Karnataka', city: 'Bangalore' },
    '400001': { country: 'India', state: 'Maharashtra', city: 'Mumbai' },
    '90001': { country: 'USA', state: 'California', city: 'Los Angeles' }
};

// Dummy data blacklist - values that should be rejected
const dummyDataBlacklist = {
    emails: [
        'test@test.com', 'test@example.com', 'admin@admin.com', 'user@user.com',
        'demo@demo.com', 'demo@example.com', 'sample@sample.com', 'info@info.com',
        'test@gmail.com', 'dummy@dummy.com', 'temp@temp.com', 'hello@hello.com',
        'abc@abc.com', 'admin@example.com', 'test123@test.com', 'user123@user.com','nageshnandaragi20@gmail.com'
    ],
    usernames: [
        'test', 'admin', 'user', 'demo', 'sample', 'temp', 'hello', 'abc',
        'test123', 'user123', 'admin123', 'password', 'qwerty', 'asdfgh',
        'test1234', 'testuser', 'adminuser', 'demouser'
    ],
    names: [
        'test', 'admin', 'demo', 'sample', 'temp', 'dummy', 'abc', 'xyz', 'asdf'
    ],
    phones: [
        '1234567890', '9999999999', '1111111111', '5555555555', '0000000000',
        '6666666666', '7777777777', '8888888888', '1234567801', '9876543210'
    ]
};

// Function to detect repetitive patterns and gibberish
const hasRepetitivePattern = (str) => {
    // Don't check pure numeric strings (mobile numbers, postal codes, etc.)
    if (/^\d+$/.test(str)) {
        // For numeric strings, only check for extreme repetition like 1111111111
        const firstChar = str[0];
        let consecutiveCount = 1;
        
        for (let i = 1; i < str.length; i++) {
            if (str[i] === firstChar) {
                consecutiveCount++;
            } else {
                break;
            }
        }
        
        // Only reject if same digit repeats 8+ times consecutively (like 11111111)
        if (consecutiveCount >= 8) return true;
        
        return false;
    }
    
    // Check for patterns like "adadada" or "asdasd" or "kukukuku" (for text fields)
    for (let len = 1; len <= Math.min(5, str.length / 2); len++) {
        const pattern = str.substring(0, len);
        let matchCount = 0;
        
        for (let i = 0; i < str.length; i += len) {
            const segment = str.substring(i, i + len);
            if (segment === pattern || (i + len > str.length && segment.startsWith(pattern))) {
                matchCount++;
            }
        }
        
        // If pattern repeats 3 or more times, it's repetitive
        if (matchCount >= 3 && len <= 3) return true;
        if (matchCount >= 4 && len === 4) return true;
    }
    
    // Check for repeated 2-3 letter patterns (like "kuku" repeating)
    for (let len = 2; len <= 4; len++) {
        for (let start = 0; start < str.length - (len * 2); start++) {
            const pattern = str.substring(start, start + len).toLowerCase();
            let repeatCount = 1;
            
            for (let i = start + len; i <= str.length - len; i += len) {
                const segment = str.substring(i, i + len).toLowerCase();
                if (segment === pattern) {
                    repeatCount++;
                } else {
                    break;
                }
            }
            
            // If a 2-3 letter pattern repeats 3+ times consecutively, reject it
            if (repeatCount >= 3 && len <= 3) return true;
        }
    }
    
    // Check for consonant-heavy gibberish (random keyboard mashing) - ONLY for text
    const consonants = (str.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
    const vowels = (str.match(/[aeiou]/gi) || []).length;
    const total = consonants + vowels;
    
    // If more than 75% consonants in a field with 8+ chars, it's likely gibberish
    if (total > 0 && str.length >= 8 && consonants / total > 0.75) {
        return true;
    }
    
    return false;
};

// Check repeated characters (3+ consecutive)
const hasRepeat = (str, max = 3) => new RegExp(`(.)\\1{${max},}`).test(str);

// RFC 5322 compliant email validation with realistic check
const isValidEmail = (email) => {
    const email_lower = email.toLowerCase();
    
    // Check blacklist first
    if (dummyDataBlacklist.emails.includes(email_lower)) {
        return false;
    }
    
    // Check for repetitive patterns
    if (hasRepetitivePattern(email_lower)) {
        return false;
    }
    
    // Check for repeated domain extensions (comcom, netnet, orgorg)
    if (/\.(com|net|org|edu|gov|co|in|uk|us|au|de|fr|it|es|br|ca|mx|ru|cn|jp|ind){2,}$/.test(email_lower)) {
        return false;
    }
    
    // Length checks
    if (email.length > 320) return false;
    
    const [localPart, ...domainParts] = email.split('@');
    const domain = domainParts.join('@');
    
    // Must have exactly one @
    if (domainParts.length !== 1) return false;
    
    // Local part validation (before @)
    if (!localPart || localPart.length > 64) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false;
    
    // Valid characters in local part: A-Z a-z 0-9 . _ % + -
    if (!/^[A-Za-z0-9._+%-]+$/.test(localPart)) return false;
    
    // Check if local part has at least one letter (prevent all numbers/symbols)
    if (!/[A-Za-z]/.test(localPart)) return false;
    
    // Domain validation
    if (!domain || domain.length > 255) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.includes('..')) return false;
    
    // Split domain into labels
    const labels = domain.split('.');
    
    // Must have at least 2 labels (example.com)
    if (labels.length < 2) return false;
    
    // TLD must be at least 2 characters and only letters
    const tld = labels[labels.length - 1];
    if (!/^[A-Za-z]{2,6}$/.test(tld)) return false;
    
    // Validate each label (domain name parts)
    for (let label of labels) {
        if (!label || label.length > 63) return false;
        if (label.startsWith('-') || label.endsWith('-')) return false;
        if (!/^[A-Za-z0-9-]+$/.test(label)) return false;
        
        // Check if label has at least one letter (prevent all numbers)
        if (!/[A-Za-z]/.test(label)) return false;
    }
    
    return true;
};

// Enhanced name validation
const isValidName = (str) => {
    if (!str || str.length > 50) return false;
    
    // Check blacklist
    if (dummyDataBlacklist.names.includes(str.toLowerCase())) return false;
    
    // Check repetitive patterns
    if (hasRepetitivePattern(str)) return false;
    
    // Allow single letter with optional dot: "A", "A.", "N", "N.", ".N", ".n"
    if (/^\.?[A-Za-z]\.?$/.test(str)) return true;
    
    // Allow: letters with spaces/dots, apostrophes for names
    if (!/^[A-Za-z]+(?:[.\s'-]*[A-Za-z]+)*\.?$/.test(str)) return false;
    
    // Prevent multiple consecutive spaces
    if (/\s{2,}/.test(str)) return false;
    
    // Prevent leading/trailing spaces
    if (str !== str.trim()) return false;
    
    return true;
};

// Validation rules (UPDATED - username now accepts special characters)
const rules = {
    name: { 
        pattern: /^[A-Za-z]+(?:[.\s'-]*[A-Za-z]+)*\.?$/, 
        msg: 'Letters, spaces, dots, apostrophes. No repeated patterns',
        customValidator: isValidName
    },
    username: { 
        pattern: /^[A-Za-z0-9_@.#$%&*+-]{3,}$/, 
        msg: 'Letters/numbers/special chars, min 3. No dummy/repeated patterns',
        customValidator: (val) => {
            if (dummyDataBlacklist.usernames.includes(val.toLowerCase())) return false;
            if (hasRepetitivePattern(val)) return false;
            return true;
        }
    },
    email: { 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
        msg: 'Valid email required',
        customValidator: isValidEmail
    },
    mobile: { 
        pattern: /^[6789][0-9]{9}$/, 
        msg: 'Exactly 10 digits starting with 6, 7, 8, or 9',
        customValidator: (val) => {
            if (dummyDataBlacklist.phones.includes(val)) return false;
            if (hasRepetitivePattern(val)) return false;
            return true;
        }
    },
    password: { 
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, 
        msg: 'Min 8: A-Z, a-z, 0-9, special. No repeated patterns',
        customValidator: (val) => {
            if (hasRepetitivePattern(val)) return false;
            return true;
        }
    },
    address: { 
        pattern: /^[A-Za-z0-9\s.,#-]{10,}$/, 
        msg: 'Min 10 chars. No repeated patterns',
        customValidator: (val) => {
            if (hasRepetitivePattern(val)) return false;
            return true;
        }
    },
    postal: { 
        pattern: /^[0-9]{6}$/, 
        msg: 'Must be exactly 6 digits',
        customValidator: (val) => {
            if (hasRepetitivePattern(val)) return false;
            return true;
        }
    },
    securityAnswer: { 
        pattern: /^.{2,}$/, 
        msg: 'Min 2 characters. No repeated patterns',
        customValidator: (val) => {
            if (hasRepetitivePattern(val)) return false;
            return true;
        }
    },
    required: { pattern: /^.+$/, msg: 'Required' }
};

const filters = {
    name: v => {
        // Remove invalid characters first (but keep dots)
        v = v.replace(/[^A-Za-z\s.'-]/g, '');
        
        // If it's just a single letter with dot (like .n or n. or N.), keep it as is after cleaning
        if (/^\.?[A-Za-z]\.?$/.test(v)) {
            v = v.replace(/[a-z]/g, c => c.toUpperCase());
        } else {
            // Capitalize first letter of each word
            v = v.replace(/^[a-z]/, c => c.toUpperCase());
            v = v.replace(/\s[a-z]/g, c => c.toUpperCase());
            v = v.replace(/\.[a-z]/g, c => c.toUpperCase());
            v = v.replace(/-[a-z]/g, c => c.toUpperCase());
            v = v.replace(/'[a-z]/g, c => c.toUpperCase());
        }
        return v;
    },
    username: v => v.replace(/[^A-Za-z0-9_@.#$%&*+-]/g, ''),
    mobile: v => v.replace(/[^0-9]/g, ''),
    address: v => v.replace(/[^A-Za-z0-9\s.,#-]/g, ''),
    postal: v => v.replace(/[^0-9]/g, '')
};

// Initialize countries
Object.keys(locations).forEach(country => {
    document.getElementById('country').add(new Option(country, country));
});

// Cascade location dropdowns
const updateDropdown = (src, tgt, data, enable = true) => {
    tgt.innerHTML = '<option value="">Select ' + tgt.id.charAt(0).toUpperCase() + tgt.id.slice(1) + '</option>';
    tgt.disabled = !enable;
    if (enable && data) Object.keys(data).forEach(k => tgt.add(new Option(k, k)));
    validate(tgt);
};

document.getElementById('country').addEventListener('change', function() {
    const states = locations[this.value];
    updateDropdown(this, document.getElementById('state'), states, !!states);
    updateDropdown(this, document.getElementById('city'), null, false);
    validate(this);
});

document.getElementById('state').addEventListener('change', function() {
    const cities = locations[document.getElementById('country').value]?.[this.value];
    updateDropdown(this, document.getElementById('city'), cities?.reduce((o,c) => (o[c]=c, o), {}), !!cities);
    validate(this);
});

// Add DOB input validation
document.getElementById('dob').addEventListener('change', function() {
    validate(this);
});

// Block/unblock field navigation
const blockField = f => { blockedField = f; f.style.outline = '3px solid #e74c3c'; };
const unblockField = f => { if (blockedField === f) { blockedField = null; f.style.outline = ''; } };

document.addEventListener('focusin', e => {
    if (blockedField && e.target !== blockedField && e.target.tagName !== 'BODY') {
        e.preventDefault();
        e.stopPropagation();
        blockedField.focus();
        blockedField.classList.add('invalid');
    }
}, true);

// Validation function - ENHANCED with custom validators
const validate = field => {
    const rule = field.dataset.rule;
    const val = field.value.trim();
    const err = field.parentElement.querySelector('.error-message') || document.getElementById(field.id + 'Error');
    if (!err) return true;

    let valid = false, msg = '';

    // Check for repetitive patterns in all fields FIRST
    if (val && ['name', 'username', 'mobile', 'address', 'securityAnswer', 'email', 'password', 'postal'].includes(rule)) {
        if (hasRepetitivePattern(val)) {
            msg = 'No gibberish or repetitive patterns allowed';
            field.setAttribute('aria-invalid', true);
            field.className = field.className.replace(/\b(valid|invalid)\b/g, '') + ' invalid';
            if (field.parentElement?.classList.contains('form-group')) {
                field.parentElement.classList.toggle('valid', false);
            }
            err.textContent = msg;
            checkFormValid();
            return false;
        }
    }

    if (field.id === 'confirmPassword') {
        valid = val === document.getElementById('password').value && val;
        msg = valid ? '' : 'Passwords do not match';
    } else if (field.id === 'dob') {
        if (!val) { 
            msg = 'Date of birth required';
            const ageContainer = document.getElementById('ageDisplayContainer');
            if (ageContainer) ageContainer.style.display = 'none';
        }
        else {
            const inputDate = new Date(val);
            const today = new Date();
            
            // Check if date is in the future
            if (inputDate > today) {
                msg = 'Date cannot be in the future';
                valid = false;
            } else {
                const age = Math.floor((Date.now() - inputDate.getTime()) / 31557600000);
                
                // Check year validity (between 1900 and current year)
                const year = inputDate.getFullYear();
                const currentYear = today.getFullYear();
                
                if (year < 1900 || year > currentYear) {
                    msg = 'Year must be between 1900 and ' + currentYear;
                    valid = false;
                } else {
                    valid = age >= 13;
                    msg = valid ? '' : 'Must be 13+ years old';
                }
                
                // Update age display
                const ageContainer = document.getElementById('ageDisplayContainer');
                const ageDisplay = document.getElementById('ageDisplay');
                if (ageContainer && ageDisplay && valid) {
                    ageDisplay.textContent = age;
                    ageContainer.style.display = 'block';
                } else if (ageContainer) {
                    ageContainer.style.display = 'none';
                }
                
                // Show/hide parental consent section based on age
                const consentSection = document.getElementById('parentalConsentSection');
                if (valid && age >= 13 && age < 18) {
                    consentSection.classList.remove('hidden');
                    isMinor = true;
                } else {
                    consentSection.classList.add('hidden');
                    isMinor = false;
                }
            }
        }
    } else if (rules[rule]) {
        // Run pattern check first
        valid = rules[rule].pattern.test(val);
        
        // If pattern passes and custom validator exists, run it
        if (valid && rules[rule].customValidator) {
            valid = rules[rule].customValidator(val);
        }
        
        msg = valid ? '' : rules[rule].msg;
    } else {
        valid = val.length > 0;
        msg = valid ? '' : 'Required';
    }

    field.setAttribute('aria-invalid', !valid);
    field.className = field.className.replace(/\b(valid|invalid)\b/g, '') + (valid ? ' valid' : ' invalid');
    if (field.parentElement?.classList.contains('form-group')) {
        field.parentElement.classList.toggle('valid', valid);
    }
    err.textContent = msg;
    if (valid) unblockField(field);
    checkFormValid();
    return valid;
};

// Apply filters and validation
document.querySelectorAll('[data-rule]').forEach(f => {
    const rule = f.dataset.rule;
    if (filters[rule]) {
        f.addEventListener('input', e => {
            e.target.value = filters[rule](e.target.value);
            validate(f);
        });
    } else {
        f.addEventListener('input', () => validate(f));
    }
    
    f.addEventListener('blur', () => { if (!validate(f) && f.value.trim()) blockField(f); });
    f.addEventListener('keydown', e => {
        if (e.key === 'Enter' && f.tagName !== 'TEXTAREA') {
            e.preventDefault();
            validate(f) ? (unblockField(f), focusNext(f)) : blockField(f);
        }
    });
});

const focusNext = cur => {
    const all = Array.from(document.querySelectorAll('input:not([hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button'));
    const idx = all.indexOf(cur);
    if (idx < all.length - 1) all[idx + 1].focus();
};

// Gender & Terms validation
document.querySelectorAll('[name="gender"]').forEach(r => r.addEventListener('change', function() {
    document.getElementById('genderError').textContent = '';
    this.setAttribute('aria-checked', 'true');
    checkFormValid();
}));

document.getElementById('terms').addEventListener('change', function() {
    document.getElementById('termsError').textContent = this.checked ? '' : 'Must agree';
    checkFormValid();
});

document.getElementById('guardianConsent')?.addEventListener('change', function() {
    document.getElementById('guardianConsentError').textContent = this.checked ? '' : 'Consent required';
    checkFormValid();
});

// Photo upload with validation
photoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const err = document.getElementById('photoError');
    const prev = photoPreview;
    
    err.textContent = '';
    prev.classList.remove('error');
    
    if (!file) return err.textContent = 'Photo required', uploadedPhotoData = '', prev.classList.add('error'), checkFormValid();
    
    const valid = ['.jpg', '.jpeg', '.png', '.svg'].some(ext => file.name.toLowerCase().endsWith(ext)) &&
                  ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'].includes(file.type);
    
    if (!valid) return err.textContent = '❌ Only JPG, PNG, SVG allowed', this.value = '', prev.classList.add('error'), checkFormValid();
    if (file.size > 5242880) return err.textContent = `❌ Too large (${(file.size/1048576).toFixed(2)}MB). Max 5MB`, this.value = '', prev.classList.add('error'), checkFormValid();
    if (file.size < 1024) return err.textContent = '❌ File too small', this.value = '', prev.classList.add('error'), checkFormValid();
    
    const reader = new FileReader();
    reader.onerror = () => (err.textContent = '❌ Error reading file', this.value = '', prev.classList.add('error'), checkFormValid());
    reader.onload = e => {
        const img = new Image();
        img.onerror = () => (err.textContent = '❌ Invalid image', this.value = '', prev.classList.add('error'), checkFormValid());
        img.onload = () => {
            if (img.width < 100 || img.height < 100) return err.textContent = '❌ Min 100x100px', this.value = '', prev.classList.add('error'), checkFormValid();
            if (img.width > 5000 || img.height > 5000) return err.textContent = '❌ Max 5000x5000px', this.value = '', prev.classList.add('error'), checkFormValid();
            
            uploadedPhotoData = e.target.result;
            prev.innerHTML = `<img src="${uploadedPhotoData}" loading="lazy" alt="Profile">`;
            prev.classList.add('has-image');
            err.style.color = '#27ae60';
            err.textContent = `✓ Uploaded (${(file.size/1024).toFixed(1)}KB, ${img.width}x${img.height}px)`;
            setTimeout(() => (err.textContent = '', err.style.color = '#e74c3c'), 3000);
            checkFormValid();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// Password toggle
document.querySelectorAll('.toggle-password').forEach(icon => {
    const toggle = function() {
        const inp = this.previousElementSibling;
        inp.type = inp.type === 'password' ? 'text' : 'password';
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    };
    icon.addEventListener('click', toggle);
    icon.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle.call(icon)));
});

// Check form validity - debounced for performance
let validityTimeout;
const checkFormValid = () => {
    clearTimeout(validityTimeout);
    validityTimeout = setTimeout(() => {
        const fields = ['firstName', 'lastName', 'username', 'email', 'mobile', 'dob', 'postalCode', 'country', 'state', 'city', 'education', 'password', 'confirmPassword', 'address', 'securityQuestion', 'securityAnswer'];
        const valid = fields.every(id => document.getElementById(id)?.classList.contains('valid'));
        const checks = [
            document.querySelector('[name="gender"]:checked'),
            document.getElementById('terms').checked,
            uploadedPhotoData,
            !isMinor || (['guardianName', 'guardianEmail', 'guardianPhone'].every(id => document.getElementById(id)?.classList.contains('valid')) && document.getElementById('guardianConsent')?.checked)
        ];
        submitBtn.disabled = !(valid && checks.every(Boolean));
    }, 50);
};

// Form submission
form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
        'First Name': document.getElementById('firstName').value,
        'Last Name': document.getElementById('lastName').value,
        'Username': document.getElementById('username').value,
        'Email': document.getElementById('email').value,
        'Mobile': document.getElementById('mobile').value,
        'Date of Birth': document.getElementById('dob').value,
        'Gender': document.querySelector('[name="gender"]:checked').value,
        'Postal Code': document.getElementById('postalCode').value,
        'Country': document.getElementById('country').value,
        'State': document.getElementById('state').value,
        'City': document.getElementById('city').value,
        'Education': document.getElementById('education').value,
        'Address': document.getElementById('address').value,
        'Security Question': document.getElementById('securityQuestion').selectedOptions[0].text,
        'Security Answer': document.getElementById('securityAnswer').value
    };
    
    if (isMinor) ['guardianName', 'guardianEmail', 'guardianPhone'].forEach((id, i) => data[['Guardian Name', 'Guardian Email', 'Guardian Phone'][i]] = document.getElementById(id).value);
    
    document.getElementById('modalPhoto').innerHTML = `<img src="${uploadedPhotoData}" loading="lazy" alt="Profile">`;
    document.getElementById('confirmTable').innerHTML = '<tr><th>Field</th><th>Value</th></tr>' + Object.entries(data).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    document.getElementById('confirmModal').classList.add('show');
    document.getElementById('closeModal').focus();
});

// Reset form
const reset = () => {
    document.getElementById('confirmModal').classList.remove('show');
    form.reset();
    photoPreview.innerHTML = '<i class="fas fa-user-circle"></i><span>Click to Upload</span>';
    photoPreview.className = 'photo-preview';
    uploadedPhotoData = '';
    document.querySelectorAll('.valid, .invalid').forEach(el => el.classList.remove('valid', 'invalid'));
    document.querySelectorAll('.error-message').forEach(el => (el.textContent = '', el.style.color = '#e74c3c'));
    document.getElementById('parentalConsentSection').classList.add('hidden');
    document.getElementById('ageDisplayContainer').style.display = 'none';
    ['state', 'city'].forEach(id => {
        const el = document.getElementById(id);
        el.disabled = true;
        el.innerHTML = `<option value="">Select ${id.charAt(0).toUpperCase() + id.slice(1)}</option>`;
    });
    isMinor = false;
    blockedField = null;
    checkFormValid();
    document.getElementById('firstName').focus();
};

document.getElementById('closeModal').addEventListener('click', reset);
document.getElementById('closeModal').addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), reset()));
document.getElementById('confirmModal').addEventListener('keydown', e => e.key === 'Escape' && reset());

// Social buttons
document.querySelectorAll('.social-btn').forEach(btn => btn.addEventListener('click', () => alert(`${btn.classList.contains('google') ? 'Google' : btn.classList.contains('facebook') ? 'Facebook' : 'X'} login coming soon!`)));

// Photo preview click
document.querySelector('.photo-upload-btn').addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), photoInput.click()));

// Initialize
document.getElementById('firstName').focus();