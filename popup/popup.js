// Basic popup script - could be expanded later

document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = 'Active'; // Simple status
    }
    console.log('Popup loaded.');
});
