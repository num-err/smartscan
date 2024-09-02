document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = "https://smartscan-dea1de40ff8e.herokuapp.com";
    let videoStream;
    let scanInterval;

    // DOM Elements
    const addMemberButton = document.getElementById('add-member-button');
    const getMemberButton = document.getElementById('get-member-button');
    const scanMemberButton = document.getElementById('scan-member-button');
    const cancelButton = document.getElementById('cancel-button');
    const addMemberSection = document.getElementById('add-member-section');
    const getMemberSection = document.getElementById('get-member-section');
    const scanMemberSection = document.getElementById('scan-member-section');
    const addMemberForm = document.getElementById('add-member-form');
    const newMemberNameInput = document.getElementById('new-member-name');
    const newMemberIdInput = document.getElementById('new-member-id');
    const newMemberMaleInput = document.getElementById('new-member-male');
    const newMemberFemaleInput = document.getElementById('new-member-female');
    const newMemberSpecialInput = document.getElementById('new-member-special');
    const newMemberImageInput = document.getElementById('new-member-image');
    const addMemberMessage = document.getElementById('add-member-message');
    const getMemberForm = document.getElementById('get-member-form');
    const getMemberIdInput = document.getElementById('get-member-id');
    const getMemberInfoDiv = document.getElementById('get-member-info');
    const scanResultDiv = document.getElementById('scan-result');
    const readerElement = document.getElementById('reader');
    const canvasElement = document.createElement('canvas');
    const canvasContext = canvasElement.getContext('2d');

    // Track last scanned or retrieved member ID and time
    let lastScannedMemberId = null;
    let lastScanTime = null;

    // Utility Functions
    function showSection(section) {
        hideAllSections();
        section.classList.remove('hidden');
        cancelButton.classList.remove('hidden');
        console.log(`Showing section: ${section.id}`);
    }

    function hideAllSections() {
        addMemberSection.classList.add('hidden');
        getMemberSection.classList.add('hidden');
        scanMemberSection.classList.add('hidden');
        cancelButton.classList.add('hidden');
        console.log('All sections hidden');
    }

    function showMessage(message, success = true, targetDiv = 'scan-result') {
        const messageDiv = document.getElementById(targetDiv);
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        console.log(`Message shown: ${message}`);
    
        // Hide the message after a timeout
        setTimeout(() => {
            messageDiv.style.display = 'none';
            console.log('Message hidden');
        }, 5000); // Adjust timing as needed
    }


    async function stopQrScanner() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            clearInterval(scanInterval);
            readerElement.style.display = 'none';
            console.log('QR code scanner stopped');
        }
    }

    async function addMember(name, id, numberOfMaleMembers, numberOfFemaleMembers, specialCase, imageFile) {
    console.log('Adding member with ID:', id);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('id', id);
    formData.append('numberOfMaleMembers', numberOfMaleMembers);
    formData.append('numberOfFemaleMembers', numberOfFemaleMembers);
    formData.append('specialCase', specialCase);
    formData.append('image', imageFile);

    try {
        const response = await axios.post(`${apiUrl}/users`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Member added successfully:', response.data);
        showMessage('Member added successfully!', true);
    } catch (error) {
        console.error('Error adding member:', error);

        if (error.response) {
            if (error.response.status === 400 && error.response.data.message.includes("User with this ID already exists")) {
                showMessage("A member with this ID already exists. Please use a different ID.", false);
            } else if (error.response.status === 400) {
                showMessage("Please fill in all required fields.", false);
            } else {
                showMessage("Unexpected error occurred. Please try again.", false);
            }
        } else {
            showMessage("Unexpected error occurred. Please try again.", false);
        }
    }
}

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function displayMemberInfo(member) {
        if (!member) {
            console.error("No member data provided to display.");
            return;
        }

        let imageUrl;
        try {
            imageUrl = member.imageUrl
                ? `data:image/jpeg;base64,${arrayBufferToBase64(member.imageUrl.data)}`
                : '/uploads/default.jpg';
            console.log('Member image URL prepared');
        } catch (e) {
            imageUrl = '/uploads/default.jpg';
            console.error('Error processing image data:', e);
        }

        const adjustedImageSize = 'max-width: 100%; height: auto;';
        getMemberInfoDiv.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong>${member.name}</strong><br>
                ID: ${member.id}<br>
                Number of Male Members: ${member.numberOfMaleMembers}<br>
                Number of Female Members: ${member.numberOfFemaleMembers}<br>
                Special Case: ${member.specialCase}<br>
                <img src="${imageUrl}" alt="Member Image" style="${adjustedImageSize}">
            </div>
        `;
        console.log('Member info displayed');

        setTimeout(() => {
            getMemberInfoDiv.innerHTML = '';
            console.log('Member info cleared');
        }, 30000);  // Clears the info after 30 seconds
    }

    async function fetchMemberById(id) {
        console.log('Fetching member with ID:', id);
    
        // Check for duplicate access within the last 24 hours
        if (lastScannedMemberId === id && lastScanTime && new Date() - lastScanTime < 24 * 60 * 60 * 1000) {
            console.warn('Duplicate scan detected via Get Member by ID');
            showMessage("You can only scan once per day. Please try again tomorrow.", false, 'get-member-error');
            return;
        }
    
        try {
            await stopQrScanner(); // Stop the QR scanner if it's running
            const response = await axios.get(`${apiUrl}/users/${id}`);
            console.log('Fetched member data:', response.data);
            displayMemberInfo(response.data);
    
            // Update last scanned ID and time
            lastScannedMemberId = id;
            lastScanTime = new Date();
        } catch (error) {
            console.error('Error fetching member:', error);
    
            if (error.response) {
                const statusCode = error.response.status;
                const errorMessage = error.response.data.message || '';
    
                if (statusCode === 400 && errorMessage.includes("scan once per day")) {
                    console.log("Displaying duplicate scan error message");
                    showMessage("You can only scan once per day. Please try again tomorrow.", false, 'get-member-error');
                } else if (statusCode === 404) {
                    console.log("Displaying member not found error message");
                    showMessage("Member not found. Please check the ID and try again.", false, 'get-member-error');
                } else {
                    console.log("Displaying unexpected error message");
                    showMessage("Unexpected error occurred. Please try again.", false, 'get-member-error');
                }
            } else {
                // Handle other types of errors, such as network issues
                console.log("Displaying network or unexpected error message");
                showMessage("Unexpected error occurred. Please try again.", false, 'get-member-error');
            }
        }
    }

    async function processFrame() {
        if (readerElement.readyState === readerElement.HAVE_ENOUGH_DATA) {
            canvasElement.width = readerElement.videoWidth;
            canvasElement.height = readerElement.videoHeight;
            canvasContext.drawImage(readerElement, 0, 0, canvasElement.width, canvasElement.height);
            const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                console.log('QR Code detected:', code.data);
                onScanSuccess(code.data);
            }
        }
    }

    function startQrScanner() {
        const constraints = {
            video: {
                facingMode: { ideal: "environment" }, // Prefer rear camera, but not mandatory
                width: { ideal: 1280 }, // Ideal resolution
                height: { ideal: 720 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                videoStream = stream;
                readerElement.srcObject = stream;
                readerElement.setAttribute("playsinline", true); // Prevent iOS from fullscreening the video
                readerElement.style.display = 'block';
                readerElement.play(); // Start playing the video stream
                console.log('Camera stream started successfully');

                scanInterval = setInterval(processFrame, 100); // Process the video frame every 100ms
                console.log('QR code scanning started');
            })
            .catch(err => {
                if (err.name === 'NotAllowedError') {
                    console.error("NotAllowedError: Permissions were denied. Please check browser settings.", err);
                    showMessage("Camera permissions were denied. Please enable camera access in your browser settings and try again.", false);
                } else if (err.name === 'OverconstrainedError') {
                    console.error("OverconstrainedError: The requested constraints could not be satisfied.", err);
                    showMessage("The camera constraints could not be satisfied. Please check your device's capabilities.", false);
                } else if (err.name === 'NotFoundError') {
                    console.error("NotFoundError: No camera found.", err);
                    showMessage("No camera found on this device. Please check your hardware.", false);
                } else {
                    console.error("Error accessing camera:", err);
                    showMessage("Unable to access the camera. Please ensure camera permissions are granted.", false);
                }
            });

        readerElement.style.display = 'block'; // Ensure the video element is visible
    }

    function onScanSuccess(decodedText) {
        console.log('QR scan successful:', decodedText);
    
        // Check for duplicate access within the last 24 hours
        if (lastScannedMemberId === decodedText && lastScanTime && new Date() - lastScanTime < 24 * 60 * 60 * 1000) {
            console.warn('Duplicate scan detected via QR code');
            showMessage("You can only scan once per day. Please try again tomorrow.", false);
            return;
        }
    
        stopQrScanner();
    
        axios.get(`${apiUrl}/users/${decodedText}`).then(response => {
            const member = response.data;
            console.log('Member info fetched:', member);
            displayMemberInfo(member);
    
            // Update the last scanned ID and time
            lastScannedMemberId = decodedText;
            lastScanTime = new Date();
    
            axios.put(`${apiUrl}/users/${member.id}`, { lastScanTime: lastScanTime });
            console.log('Member last scan time updated');
    
            showMessage("Scan successful!");
    
        }).catch(error => {
            console.error('Error processing scan:', error);
            if (error.response) {
                const statusCode = error.response.status;
                const errorMessage = error.response.data.message || '';
    
                if (statusCode === 400 && errorMessage.includes('scan once per day')) {
                    showMessage("You can only scan once per day. Please try again tomorrow.", false);
                } else if (statusCode === 404) {
                    showMessage("Member not found. Please check the QR code and try again.", false);
                } else {
                    showMessage("Error processing scan. Please try again.", false);
                }
            } else {
                showMessage("Unexpected error occurred. Please try again.", false);
            }
        });
    }
        
        // Event Listeners
        addMemberButton.addEventListener('click', () => {
            showSection(addMemberSection);
        });
        
        getMemberButton.addEventListener('click', () => {
            showSection(getMemberSection);
        });
        
        scanMemberButton.addEventListener('click', () => {
            showSection(scanMemberSection);
            startQrScanner();
        });
        
        cancelButton.addEventListener('click', () => {
            hideAllSections();
            stopQrScanner();
        });
        
        addMemberForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = newMemberNameInput.value.trim();
            const id = newMemberIdInput.value.trim();
            const numberOfMaleMembers = newMemberMaleInput.value.trim();
            const numberOfFemaleMembers = newMemberFemaleInput.value.trim();
            const specialCase = newMemberSpecialInput.value.trim();
            const imageFile = newMemberImageInput.files[0];
            if (name && id && numberOfMaleMembers && numberOfFemaleMembers && specialCase && imageFile) {
                console.log('Form submitted with valid data');
                addMember(name, id, numberOfMaleMembers, numberOfFemaleMembers, specialCase, imageFile);
                addMemberForm.reset();
                console.log('Form reset after submission');
            } else {
                console.warn('Form validation failed. Missing required fields.');
                showMessage('Please fill in all required fields.', false);
            }
        });
        
        getMemberForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const memberId = getMemberIdInput.value.trim();
            if (memberId) {
                console.log('Fetching member with ID:', memberId);
                fetchMemberById(memberId);
            } else {
                console.warn('Member ID is required to fetch member info.');
                showMessage('Please enter a valid Member ID.', false);
            }
        });
    });