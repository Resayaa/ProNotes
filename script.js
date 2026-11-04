$(document).ready(function() {
  
  /* ==========================================================================
     1. RESPONSIVE MENÜ & OVERLAY YÖNETİMİ
     ========================================================================== */

  // Sol Menü Aç/Kapat (Hamburger Menü Tetikleyicisi)
  $("#menuToggle").on("click", function() {
    $("#sidebar, #overlay").toggleClass("active");
  });

  // Karartılmış Arka Plana (Overlay) Tıklandığında Menüyü Kapatma
  $("#overlay").on("click", function() {
    $("#sidebar, #overlay").removeClass("active");
  });


  /* ==========================================================================
     2. MODAL (PENCERE) AÇILIŞ VE KAPANIŞ AYARLARI
     ========================================================================== */

  // Yeni Not Ekle Butonuna Tıklandığında Modalı Hazırlama
  $("#addNoteBtn").on("click", function() {
    resetForm(); 
    $("#modalTitle").text("Yeni Not Oluştur");
    $("#noteForm").attr("data-mode", "add").removeAttr("data-edit-id");
    $("#noteModal").css("display", "flex");
    $("#sidebar, #overlay").removeClass("active"); // Mobil uyum odaklı
  });

  // Modalı Kapatma (Kapat butonuna veya dışındaki boşluğa tıklandığında)
  $("#closeModal, #noteModal").on("click", function(e) {
    if (e.target === this || e.target.id === "closeModal") {
      $("#noteModal").hide();
      resetForm();
    }
  });

  // Form Elemanlarını Sıfırlayan Yardımcı Fonksiyon
  function resetForm() {
    $("#noteForm")[0].reset(); 
    $(".color-radio input[value='#ffffff']").prop("checked", true);
    $("#noteForm").removeAttr("data-mode").removeAttr("data-edit-id");
  }


  /* ==========================================================================
     3. FORM SUBMIT (NOT KAYDETME & GÜNCELLEME) YÖNETİMİ
     ========================================================================== */

  $("#noteForm").on("submit", function(e) {
    e.preventDefault(); 
    
    let title = $("#noteTitle").val().trim();
    let content = $("#noteContent").val().trim();
    let color = $("input[name='noteColor']:checked").val() || "#ffffff";
    let mode = $(this).attr("data-mode"); 

    if (!title || !content) return;

    // MOD 1: YENİ NOT EKLEME
    if (mode === "add") {
      let note = {
        id: Date.now(), // Benzersiz milisaniye tabanlı ID
        title: title,
        content: content,
        color: color
      };
      saveNote(note);    
      displayNote(note); 
    } 
    
    // MOD 2: MEVCUT NOTU DÜZENLEME (PERFORMANS OPTİMİZASYONU YAPILDI)
    else if (mode === "edit") {
      let editId = parseInt($(this).attr("data-edit-id"));
      updateNoteInStorage(editId, title, content, color); 
      
      let $targetCard = $(`.note[data-id="${editId}"]`);
      $targetCard.css("background", color);
      $targetCard.find("h3").text(title);
      $targetCard.find("p").text(content);
    }

    updateStats(); 
    resetForm();   
    $("#noteModal").hide(); 
  });


  /* ==========================================================================
     4. ANLIK ARAMA FİLTRESİ (REAL-TIME SEARCH)
     ========================================================================== */

  $("#searchInput").on("input", function() {
    let query = $(this).val().toLowerCase().trim(); 
    
    $(".note").each(function() {
      let title = $(this).find("h3").text().toLowerCase();
      let content = $(this).find("p").text().toLowerCase();
      
      // Akıcı arama deneyimi için ternary operatör kontrolü
      $(this).toggle(title.includes(query) || content.includes(query));
    });
  });


  /* ==========================================================================
     5. DOKUMAN AGACI (DOM) VE KART AKSİYONLARI (SİLME / DÜZENLEME)
     ========================================================================== */

  function displayNote(note) {
    let noteColor = note.color || "#ffffff"; 
    
    // XSS Açığını kapatmak için iskeleti oluşturup metinleri güvenli (.text()) ekliyoruz
    let noteDiv = $(`
      <div class="note" data-id="${note.id}" style="background: ${noteColor}">
        <div>
          <h3></h3>
          <p></p>
        </div>
        <div class="note-buttons">
          <button class="edit-btn">Düzenle</button>
          <button class="delete-btn">Sil</button>
        </div>
      </div>
    `);

    // Güvenli Veri Enjeksiyonu (XSS Koruması)
    noteDiv.find("h3").text(note.title);
    noteDiv.find("p").text(note.content);

    // KART İÇİ: Not Silme Butonu Olayı
    noteDiv.find(".delete-btn").on("click", function() {
      noteDiv.remove();      
      deleteNote(note.id);   
      updateStats();         
    });

    // KART İÇİ: Not Düzenleme Butonu Olayı
    noteDiv.find(".edit-btn").on("click", function() {
      $("#modalTitle").text("Notu Düzenle");
      $("#noteTitle").val(noteDiv.find("h3").text());     
      $("#noteContent").val(noteDiv.find("p").text()); 
      
      $(`input[name='noteColor'][value='${noteColor}']`).prop("checked", true);
      
      $("#noteForm").attr("data-mode", "edit").attr("data-edit-id", note.id);
      $("#noteModal").css("display", "flex"); 
    });

    $("#notesList").append(noteDiv);
  }


  /* ==========================================================================
     6. LOCAL STORAGE (VERİ TABANI) YARDIMCI FONKSİYONLARI
     ========================================================================== */

  // Tekrarlanan kodları engellemek için merkezi veri çekme fonksiyonu (DRY Prensibi)
  function getNotesFromStorage() {
    return JSON.parse(localStorage.getItem("notes")) || [];
  }

  function saveNotesToStorage(notes) {
    localStorage.setItem("notes", JSON.stringify(notes));
  }

  // Yeni Notu Kaydetme
  function saveNote(note) {
    let notes = getNotesFromStorage();
    notes.push(note);
    saveNotesToStorage(notes);
  }

  // Hafızadaki Notları Yükleme
  function loadNotes() {
    let notes = getNotesFromStorage();
    notes.forEach(note => displayNote(note)); 
    updateStats();
  }

  // Notu Silme
  function deleteNote(id) {
    let notes = getNotesFromStorage();
    notes = notes.filter(n => n.id !== id);
    saveNotesToStorage(notes);
  }

  // Notu Güncelleme
  function updateNoteInStorage(id, newTitle, newContent, newColor) {
    let notes = getNotesFromStorage();
    notes = notes.map(n => {
      if (n.id === id) {
        return { ...n, title: newTitle, content: newContent, color: newColor };
      }
      return n;
    });
    saveNotesToStorage(notes);
  }


  /* ==========================================================================
     7. SİSTEMSEL İSTATİSTİKLER VE BAŞLANGIÇ
     ========================================================================== */

  function updateStats() {
    let notes = getNotesFromStorage();
    $("#totalNotesCount").text(notes.length);
  }

  // UYGULAMA TETİKLEYİCİSİ
  loadNotes();

});