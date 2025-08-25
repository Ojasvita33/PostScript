// Quill editor initialization for post forms

document.addEventListener('DOMContentLoaded', function () {
  var quillEl = document.getElementById('quill-editor');
  if (quillEl) {
    var quill = new Quill('#quill-editor', {
      theme: 'snow',
      placeholder: 'Write your post content here...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });
    // If editing, set Quill's content from the textarea value
    var form = quillEl.closest('form');
    if (form) {
      var contentInput = form.querySelector('textarea[name="content"]');
      if (contentInput && contentInput.value) {
        quill.root.innerHTML = contentInput.value;
      }
      form.addEventListener('submit', function (e) {
        if (contentInput) {
          contentInput.value = quill.root.innerHTML;
          // Prevent empty content submission
          if (!quill.getText().trim()) {
            alert('Content cannot be empty!');
            e.preventDefault();
            return false;
          }
        }
      });
    }
  }
});
