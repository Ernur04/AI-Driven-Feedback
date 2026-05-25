// copy-code.js
// Копирование кода из блока
function copyCode(button) {
    const codeBlock = button.nextElementSibling;
    const text = codeBlock.innerText;

    navigator.clipboard.writeText(text)
        .then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fa-solid fa-check"></i> Көшірілді';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Көшіру қатесі:', err);
        });
}
