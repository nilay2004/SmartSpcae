// ─────────────────────────────────────────────────────────────────────────────
// Style Detector — Embedding-based Content Recommendation Engine
// No external ML libraries. Pure JavaScript frontend implementation.
// Uses: manual tag embeddings → cosine similarity → ranked recommendations
// Fallback: rule-based logic if embeddings fail
// ─────────────────────────────────────────────────────────────────────────────

var StyleDetector = function (blueprint3d, sideMenu) {

  // ── 1. GLOBAL STYLE INDEX ─────────────────────────────────────────────────
  // Every possible style tag. Order matters — each index = one dimension
  var STYLE_INDEX = [
    "modern",        // 0
    "minimal",       // 1
    "contemporary",  // 2
    "scandinavian",  // 3
    "industrial",    // 4
    "rustic",        // 5
    "bold",          // 6
    "urban",         // 7
    "boho",          // 8
    "earthy",        // 9
    "eclectic",      // 10
    "retro",         // 11
    "natural"        // 12
  ];
  var EMBEDDING_SIZE = STYLE_INDEX.length; // 13 dimensions

  // ── 2. ITEM STYLE TAGS DATABASE ───────────────────────────────────────────
  var ITEM_TAGS = {
    "Chair":                 ["modern", "minimal", "scandinavian", "contemporary"],
    "Red Chair":             ["bold", "eclectic", "retro", "urban"],
    "Blue Chair":            ["modern", "bold", "eclectic", "contemporary"],
    "Guest Chair":           ["modern", "minimal", "scandinavian"],
    "Sofa - Grey":           ["modern", "minimal", "contemporary"],
    "Sectional - Olive":     ["boho", "earthy", "eclectic", "natural"],
    "Full Bed":              ["scandinavian", "minimal", "modern", "contemporary"],
    "Dresser - Dark":        ["industrial", "rustic", "bold", "urban"],
    "Dresser - White":       ["minimal", "scandinavian", "modern", "contemporary"],
    "Bedside Table":         ["modern", "minimal", "contemporary"],
    "Nightstand":            ["minimal", "scandinavian", "modern"],
    "Wardrobe":              ["scandinavian", "minimal", "modern", "contemporary"],
    "Coffee Table":          ["scandinavian", "modern", "minimal", "natural"],
    "Side Table":            ["rustic", "boho", "eclectic", "natural"],
    "Dining Table":          ["modern", "minimal", "contemporary", "scandinavian"],
    "Dining Table 2":        ["rustic", "industrial", "eclectic", "bold"],
    "Bookshelf":             ["rustic", "industrial", "eclectic", "urban"],
    "Media Console":         ["modern", "minimal", "contemporary"],
    "Media Console - Black": ["industrial", "bold", "modern", "urban"],
    "Wooden Trunk":          ["rustic", "boho", "eclectic", "natural", "earthy"],
    "Floor Lamp":            ["modern", "minimal", "scandinavian", "contemporary"],
    "Closed Door":           ["modern", "minimal", "contemporary"],
    "Open Door":             ["modern", "minimal", "contemporary"],
    "Window":                ["modern", "minimal", "contemporary", "scandinavian"],
    "Blue Rug":              ["boho", "eclectic", "bold", "earthy"],
    "Toilet Seat":           ["minimal", "modern", "contemporary"],
    "Ganesha Poster":        ["boho", "eclectic", "earthy", "natural"],
    "Mirror":                ["modern", "minimal", "contemporary", "scandinavian"],
    "NYC Poster":            ["industrial", "bold", "urban", "eclectic"],
    "Staircase":             ["modern", "contemporary"],
    "User (3D)":             ["modern"]
  };

  // ── Style display info ────────────────────────────────────────────────────
  var STYLE_PROFILES = {
    "modern":        { label: "Modern",        emoji: "🏙️", color: "#2c3e50" },
    "minimal":       { label: "Minimal",        emoji: "◻️", color: "#7f8c8d" },
    "contemporary":  { label: "Contemporary",   emoji: "✨", color: "#3498db" },
    "scandinavian":  { label: "Scandinavian",   emoji: "❄️", color: "#5b8fa8" },
    "industrial":    { label: "Industrial",     emoji: "🏭", color: "#555555" },
    "rustic":        { label: "Rustic",         emoji: "🪵", color: "#8b6914" },
    "bold":          { label: "Bold",           emoji: "🔴", color: "#c0392b" },
    "urban":         { label: "Urban",          emoji: "🌆", color: "#34495e" },
    "boho":          { label: "Bohemian",       emoji: "🌿", color: "#7d9b6b" },
    "earthy":        { label: "Earthy",         emoji: "🌍", color: "#a0785a" },
    "eclectic":      { label: "Eclectic",       emoji: "🎨", color: "#9b59b6" },
    "retro":         { label: "Retro",          emoji: "📺", color: "#e67e22" },
    "natural":       { label: "Natural",        emoji: "🌱", color: "#27ae60" }
  };

  var MAX_PICKS = 3;
  var selectedPicks = [];   // { name, embedding, tags }
  var userVector = null;    // averaged embedding of picks

  // ── 3. EMBEDDING GENERATOR ────────────────────────────────────────────────
  // Converts tag array → fixed-length weighted vector
  // Tags get weight 1.0, repeated tags accumulate, then normalized
  function generateEmbedding(tags) {
    var vec = new Array(EMBEDDING_SIZE).fill(0);
    if (!tags || tags.length === 0) return vec;

    tags.forEach(function (tag) {
      var idx = STYLE_INDEX.indexOf(tag);
      if (idx !== -1) {
        vec[idx] += 1.0;
      }
    });

    // L2 normalize so vector length = 1
    vec = l2Normalize(vec);
    return vec;
  }

  // ── 4. VECTOR MATH UTILITIES ──────────────────────────────────────────────
  function l2Normalize(vec) {
    var magnitude = Math.sqrt(vec.reduce(function (sum, v) { return sum + v * v; }, 0));
    if (magnitude === 0) return vec;
    return vec.map(function (v) { return v / magnitude; });
  }

  // Cosine similarity between two equal-length vectors
  function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    var dot = 0, magA = 0, magB = 0;
    for (var i = 0; i < vecA.length; i++) {
      dot  += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  // ── 5. VECTOR AVERAGING ───────────────────────────────────────────────────
  // Average multiple embeddings into one user preference vector
  function averageVectors(vectors) {
    if (!vectors || vectors.length === 0) return new Array(EMBEDDING_SIZE).fill(0);
    var avg = new Array(EMBEDDING_SIZE).fill(0);
    vectors.forEach(function (vec) {
      for (var i = 0; i < EMBEDDING_SIZE; i++) {
        avg[i] += vec[i];
      }
    });
    avg = avg.map(function (v) { return v / vectors.length; });
    return l2Normalize(avg);
  }

  // ── 6. DOMINANT STYLE DETECTOR ────────────────────────────────────────────
  // From a vector, find which style dimensions are highest
  function getDominantStyles(vec, topN) {
    topN = topN || 3;
    var indexed = vec.map(function (val, idx) {
      return { tag: STYLE_INDEX[idx], score: val };
    });
    indexed.sort(function (a, b) { return b.score - a.score; });
    return indexed.slice(0, topN).filter(function (s) { return s.score > 0; });
  }

  // ── 7. EXPLAINABILITY — matching tags between user & item ─────────────────
  function getMatchingTags(userVec, itemTags) {
    var userTopStyles = getDominantStyles(userVec, 5).map(function (s) { return s.tag; });
    return itemTags.filter(function (tag) { return userTopStyles.indexOf(tag) !== -1; });
  }

  // ── 8. RECOMMENDATION ENGINE ──────────────────────────────────────────────
  function getRecommendations(userVec, pickedNames) {
    var results = [];

    try {
      // Score every catalog item using cosine similarity
      $("#items-wrapper .add-item").each(function () {
        var name  = $(this).attr("model-name");
        var url   = $(this).attr("model-url");
        var type  = $(this).attr("model-type");
        var image = $(this).find("img").attr("src");

        if (pickedNames.indexOf(name) !== -1) return; // skip picked items

        var tags = ITEM_TAGS[name] || [];
        if (tags.length === 0) return;

        var itemVec    = generateEmbedding(tags);
        var similarity = cosineSimilarity(userVec, itemVec);
        var matchTags  = getMatchingTags(userVec, tags);
        var confidence = Math.round(similarity * 100);

        results.push({
          name:       name,
          url:        url,
          type:       type,
          image:      image,
          tags:       tags,
          similarity: similarity,
          confidence: confidence,
          matchTags:  matchTags
        });
      });

      // Sort by similarity descending
      results.sort(function (a, b) { return b.similarity - a.similarity; });
      return results.slice(0, 6);

    } catch (e) {
      console.warn("StyleDetector: embedding engine failed, using fallback.", e);
      return fallbackRecommendations(pickedNames);
    }
  }

  // ── 9. FALLBACK RULE-BASED LOGIC ──────────────────────────────────────────
  function fallbackRecommendations(pickedNames) {
    var results = [];
    var pickedTags = [];
    pickedNames.forEach(function (name) {
      var tags = ITEM_TAGS[name] || [];
      tags.forEach(function (t) {
        if (pickedTags.indexOf(t) === -1) pickedTags.push(t);
      });
    });

    $("#items-wrapper .add-item").each(function () {
      var name  = $(this).attr("model-name");
      var url   = $(this).attr("model-url");
      var type  = $(this).attr("model-type");
      var image = $(this).find("img").attr("src");

      if (pickedNames.indexOf(name) !== -1) return;

      var tags  = ITEM_TAGS[name] || [];
      var score = 0;
      tags.forEach(function (t) {
        if (pickedTags.indexOf(t) !== -1) score++;
      });

      if (score > 0) {
        results.push({
          name: name, url: url, type: type, image: image,
          tags: tags, similarity: score / 10,
          confidence: Math.round((score / tags.length) * 100),
          matchTags: tags.filter(function (t) { return pickedTags.indexOf(t) !== -1; })
        });
      }
    });

    results.sort(function (a, b) { return b.similarity - a.similarity; });
    return results.slice(0, 6);
  }

  // ── 10. UI — RENDER PICKS ─────────────────────────────────────────────────
  function renderPicks() {
    var $list = $("#sd-picks-list");
    $list.empty();

    if (selectedPicks.length === 0) {
      $list.append(
        '<p class="text-muted" style="font-size:12px; margin:4px 0; line-height:1.5;">'+
        'Click any item in the 3D view to analyse its style.</p>'
      );
      $("#sd-detect-btn").prop("disabled", true).text("Pick " + MAX_PICKS + " Items First");
      return;
    }

    selectedPicks.forEach(function (pick, i) {
      var tagHtml = pick.tags.slice(0, 3).map(function (t) {
        var profile = STYLE_PROFILES[t] || { emoji: "•", color: "#999" };
        return '<span style="display:inline-block; background:' + profile.color +
               '22; color:' + profile.color + '; border:1px solid ' + profile.color +
               '44; border-radius:10px; padding:1px 7px; font-size:9px; margin:1px;">' +
               profile.emoji + ' ' + t + '</span>';
      }).join("");

      $list.append(
        '<div style="background:#f8f8f8; border:1px solid #eee; border-radius:8px;'+
        'padding:7px 10px; margin-bottom:6px;">'+
          '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">'+
            '<span style="font-size:12px; font-weight:600;">'+
              '<span style="color:#ccc; margin-right:5px;">'+(i+1)+'.</span>'+pick.name+
            '</span>'+
            '<button class="btn btn-xs sd-remove-pick" data-index="'+i+'" '+
            'style="padding:1px 7px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;">✕</button>'+
          '</div>'+
          '<div>'+tagHtml+'</div>'+
        '</div>'
      );
    });

    var remaining = MAX_PICKS - selectedPicks.length;
    if (remaining > 0) {
      $list.append(
        '<p class="text-muted" style="font-size:11px; margin:6px 0 0; text-align:center;">'+
        'Pick ' + remaining + ' more item' + (remaining > 1 ? 's' : '') + ' to detect style</p>'
      );
      $("#sd-detect-btn").prop("disabled", true)
        .text("Pick " + remaining + " More Item" + (remaining > 1 ? "s" : ""));
    } else {
      $("#sd-detect-btn").prop("disabled", false).text("✨ Detect My Style");
    }
  }

  // ── 11. UI — RENDER RESULT ────────────────────────────────────────────────
  function renderResult(dominantStyles, recs) {
    var $result = $("#sd-result");
    $result.empty().show();

    // Top style badge
    var topStyle  = dominantStyles[0];
    var profile   = STYLE_PROFILES[topStyle.tag] || { label: topStyle.tag, emoji: "✨", color: "#4a90e2" };

    // Style breakdown bar
    var barsHtml = dominantStyles.slice(0, 4).map(function (s) {
      var p = STYLE_PROFILES[s.tag] || { label: s.tag, color: "#4a90e2" };
      var pct = Math.round(s.score * 100);
      return '<div style="margin-bottom:5px;">'+
               '<div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:2px;">'+
                 '<span style="color:'+p.color+'; font-weight:600;">'+p.label+'</span>'+
                 '<span style="color:#999;">'+pct+'%</span>'+
               '</div>'+
               '<div style="background:#eee; border-radius:4px; height:5px;">'+
                 '<div style="background:'+p.color+'; width:'+pct+'%; height:5px; border-radius:4px; transition:width 0.5s;"></div>'+
               '</div>'+
             '</div>';
    }).join("");

    $result.append(
      '<div style="background:linear-gradient(135deg, '+profile.color+'22, '+profile.color+'11);'+
      'border:1px solid '+profile.color+'33; border-radius:10px; padding:12px 14px; margin-bottom:12px;">'+
        '<div style="font-size:22px; margin-bottom:4px; text-align:center;">'+profile.emoji+'</div>'+
        '<div style="font-size:14px; font-weight:700; color:'+profile.color+'; text-align:center; margin-bottom:8px;">'+
          profile.label+' Style'+
        '</div>'+
        '<div>'+barsHtml+'</div>'+
      '</div>'
    );

    // Recommendations
    if (recs.length === 0) {
      $result.append('<p class="text-muted" style="font-size:12px;">No matching items found.</p>');
    } else {
      $result.append(
        '<div style="font-size:12px; font-weight:600; margin-bottom:8px; color:#444;">'+
        '🛋️ Recommended For You</div>'
      );

      var $grid = $('<div style="display:grid; grid-template-columns:repeat(2,1fr); gap:7px;"></div>');

      recs.forEach(function (item) {
        // Confidence color
        var confColor = item.confidence >= 70 ? "#27ae60"
                      : item.confidence >= 40 ? "#e67e22"
                      : "#e74c3c";

        // Matching tags display
        var matchHtml = item.matchTags.slice(0, 2).map(function (t) {
          var p = STYLE_PROFILES[t] || { emoji: "•", color: "#999" };
          return '<span style="font-size:9px; color:'+p.color+'; background:'+p.color+'15;'+
                 'border-radius:8px; padding:1px 5px; margin:1px; display:inline-block;">'+
                 p.emoji+' '+t+'</span>';
        }).join("");

        $grid.append(
          '<div class="sd-rec-item" '+
          'data-url="'+item.url+'" data-type="'+item.type+'" data-name="'+item.name+'" '+
          'style="border:1px solid #e8e8e8; border-radius:10px; padding:8px 6px;'+
          'cursor:pointer; text-align:center; background:#fff; position:relative; transition:all 0.15s;">'+

            // Confidence badge
            '<div style="position:absolute; top:5px; right:5px; background:'+confColor+';'+
            'color:#fff; font-size:9px; font-weight:700; padding:2px 5px; border-radius:8px;">'+
              item.confidence+'%'+
            '</div>'+

            '<img src="'+item.image+'" style="width:54px; height:54px; object-fit:contain; border-radius:6px; margin-bottom:4px;" />'+
            '<div style="font-size:10px; color:#333; font-weight:600; line-height:1.3; margin-bottom:3px;">'+item.name+'</div>'+
            '<div style="margin-bottom:4px;">'+matchHtml+'</div>'+
            '<div style="font-size:10px; color:#4a90e2; font-weight:600;">+ Add to Room</div>'+
          '</div>'
        );
      });

      $result.append($grid);

      // Explainability note
      $result.append(
        '<div style="margin-top:10px; padding:8px; background:#f9f9f9; border-radius:6px; font-size:10px; color:#888; line-height:1.5;">'+
          '<span style="font-weight:600; color:#555;">ℹ️ How this works:</span> Items are ranked by cosine similarity '+
          'between your preference vector and each item\'s style embedding. '+
          'The % shows how closely each item matches your taste.'+
        '</div>'
      );
    }

    $result.append(
      '<button id="sd-reset-btn" class="btn btn-default btn-block btn-sm" style="margin-top:12px;">'+
      '↩ Try Different Items</button>'
    );
  }

  // ── 12. ADD ITEM TO SCENE ─────────────────────────────────────────────────
  function addItemToScene(name, url, type) {
    var modelUrl = (url === "null" || url === "" || !url) ? null : url;
    blueprint3d.model.scene.addItem(parseInt(type), modelUrl, {
      itemName:  name,
      resizable: true,
      modelUrl:  modelUrl,
      itemType:  parseInt(type)
    });
    if (sideMenu && sideMenu.setCurrentState && sideMenu.states) {
      sideMenu.setCurrentState(sideMenu.states.DEFAULT);
    }
  }

  // ── 13. EVENT BINDINGS ────────────────────────────────────────────────────
  function bindEvents() {

    // Item selected in 3D view → add to picks
    blueprint3d.three.itemSelectedCallbacks.add(function (item) {
      if (selectedPicks.length >= MAX_PICKS) return;
      var name = item.metadata.itemName || "Unknown";
      // No duplicates
      var alreadyPicked = selectedPicks.some(function (p) { return p.name === name; });
      if (alreadyPicked) return;

      var tags      = ITEM_TAGS[name] || [];
      var embedding = generateEmbedding(tags);

      selectedPicks.push({ name: name, tags: tags, embedding: embedding });
      renderPicks();

      // Flash panel to indicate capture
      var $panel = $("#style-detector-panel");
      var origBg = $panel.css("background-color");
      $panel.css("background-color", "#fffbe6");
      setTimeout(function () { $panel.css("background-color", origBg || ""); }, 500);
    });

    // Remove individual pick
    $(document).on("click", ".sd-remove-pick", function (e) {
      e.stopPropagation();
      var idx = parseInt($(this).data("index"));
      selectedPicks.splice(idx, 1);
      userVector = null;
      renderPicks();
      $("#sd-result").hide().empty();
    });

    // Detect button
    $(document).on("click", "#sd-detect-btn", function () {
      if (selectedPicks.length < MAX_PICKS) return;

      try {
        // Generate user preference vector
        var embeddings = selectedPicks.map(function (p) { return p.embedding; });
        userVector     = averageVectors(embeddings);

        var dominantStyles = getDominantStyles(userVector, 6);
        var pickedNames    = selectedPicks.map(function (p) { return p.name; });
        var recs           = getRecommendations(userVector, pickedNames);

        renderResult(dominantStyles, recs);
      } catch (e) {
        console.error("StyleDetector: detection failed.", e);
        // Fallback gracefully
        var pickedNames = selectedPicks.map(function (p) { return p.name; });
        var recs = fallbackRecommendations(pickedNames);
        renderResult([{ tag: "modern", score: 1 }], recs);
      }
    });

    // Add recommended item to room
    $(document).on("click", ".sd-rec-item", function () {
      addItemToScene(
        $(this).data("name"),
        $(this).data("url"),
        $(this).data("type")
      );
    });

    // Hover effects on recommendation cards
    $(document).on("mouseenter", ".sd-rec-item", function () {
      $(this).css({ "box-shadow": "0 3px 10px rgba(0,0,0,0.12)", "border-color": "#bbb", "transform": "translateY(-1px)" });
    }).on("mouseleave", ".sd-rec-item", function () {
      $(this).css({ "box-shadow": "none", "border-color": "#e8e8e8", "transform": "translateY(0)" });
    });

    // Reset button
    $(document).on("click", "#sd-reset-btn", function () {
      selectedPicks = [];
      userVector    = null;
      renderPicks();
      $("#sd-result").hide().empty();
    });
  }

  // ── 14. INIT ──────────────────────────────────────────────────────────────
  function init() {
    var html =
      '<div id="style-detector-panel" class="sidebar-section" style="transition:background-color 0.4s;">'+
        '<div class="panel">'+
          '<div class="panel-heading" style="display:flex; align-items:center; gap:6px;">'+
            '<span>✨</span>'+
            '<span style="flex:1; font-weight:600;">Style Detector</span>'+
            '<span style="font-size:10px; color:#aaa; font-weight:400;">AI-powered</span>'+
          '</div>'+
          '<div class="panel-body" style="padding:10px 12px;">'+

            '<p class="text-muted" style="font-size:11px; margin:0 0 10px; line-height:1.5;">'+
              'Select up to <strong>3 items</strong> in the 3D view. '+
              'The engine will build your style profile and recommend matching furniture.'+
            '</p>'+

            '<div id="sd-picks-list" style="margin-bottom:10px;"></div>'+

            '<button id="sd-detect-btn" class="btn btn-primary btn-block btn-sm" disabled '+
            'style="font-weight:600;">'+
              'Pick 3 Items First'+
            '</button>'+

            '<div id="sd-result" style="margin-top:12px; display:none;"></div>'+

          '</div>'+
        '</div>'+
      '</div>';

    $("#context-menu").after(html);
    renderPicks();
    bindEvents();

    console.log("StyleDetector: initialized with " + EMBEDDING_SIZE + "-dimensional style embeddings.");
  }

  init();
};