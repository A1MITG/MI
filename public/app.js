const input = document.getElementById('search-input');
const btn = document.getElementById('btn-search');
const btnExample = document.getElementById('btn-example');
const insightBox = document.getElementById('insight-box');
const insightSource = document.getElementById('insight-source');

// Store the full insights data
let insightsData = {};

function extractSections(text) {
  const sections = {
    competitors: '',
    market: '',
    monitoring: '',
    ai: ''
  };
  
  // Split by section headers and extract content
  const parts = text.split(/(?=🎯|📊|🔔|🤖)/);
  
  parts.forEach(part => {
    if (part.includes('🎯 COMPETITOR DISCOVERY')) {
      sections.competitors = part.replace('🎯 COMPETITOR DISCOVERY', '').trim();
    } else if (part.includes('📊 MARKET SIZING')) {
      sections.market = part.replace('📊 MARKET SIZING', '').trim();
    } else if (part.includes('🔔 MONITORING & ALERTS')) {
      sections.monitoring = part.replace('🔔 MONITORING & ALERTS', '').trim();
    } else if (part.includes('🤖 AI-POWERED ANALYSIS')) {
      sections.ai = part.replace('🤖 AI-POWERED ANALYSIS', '').trim();
    }
  });
  
  console.log('Extracted sections:', sections); // Debug log
  return sections;
}

function showTile(tileId, content) {
  console.log(`Showing tile: ${tileId}, content:`, content); // Debug log
  const tile = document.getElementById(`tile-${tileId}`);
  if (tile) {
    if (content) {
      tile.style.display = 'block';
      const contentDiv = tile.querySelector('.tile-content');
      if (contentDiv) {
        contentDiv.textContent = content;
      }
    } else {
      console.warn(`No content for tile: ${tileId}`);
    }
  } else {
    console.error(`Tile not found: tile-${tileId}`);
  }
}

function hideAllTiles() {
  ['competitors', 'market', 'monitoring', 'ai'].forEach(id => {
    const tile = document.getElementById(`tile-${id}`);
    if (tile) tile.style.display = 'none';
  });
}

async function fetchInsights(q){
  insightBox.innerHTML = '<em>Generating insights…</em>';
  insightSource.textContent = '...';
  hideAllTiles();
  
  try{
    const res = await fetch('/api/insights', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ query: q })
    });
    const data = await res.json();
    const text = data.text || JSON.stringify(data, null, 2);
    
    // Store the sections
    insightsData = extractSections(text);
    console.log('Insights data after extraction:', insightsData); // Debug
    
    // Format the text with better structure
    let formatted = text
      .replace(/🎯 COMPETITOR DISCOVERY/g, '<h4>🎯 COMPETITOR DISCOVERY</h4>')
      .replace(/📊 MARKET SIZING/g, '<h4>📊 MARKET SIZING</h4>')
      .replace(/🔔 MONITORING & ALERTS/g, '<h4>🔔 MONITORING & ALERTS</h4>')
      .replace(/🤖 AI-POWERED ANALYSIS/g, '<h4>🤖 AI-POWERED ANALYSIS</h4>');
    
    insightBox.innerHTML = formatted;
    insightSource.textContent = data.source || 'unknown';
    
    // Auto-show all tiles after insights are generated
    if (insightsData.competitors) showTile('competitors', insightsData.competitors);
    if (insightsData.market) showTile('market', insightsData.market);
    if (insightsData.monitoring) showTile('monitoring', insightsData.monitoring);
    if (insightsData.ai) showTile('ai', insightsData.ai);
    
  }catch(err){
    insightBox.textContent = 'Error fetching insights: ' + (err.message||err);
    insightSource.textContent = 'error';
  }
}

btn.addEventListener('click', ()=>{
  const q = input.value && input.value.trim();
  if(!q){
    insightBox.textContent = 'Please enter a company or market to search.';
    insightSource.textContent = 'local';
    return;
  }
  fetchInsights(q);
});

btnExample.addEventListener('click', ()=>{
  const example = 'Electric vehicle charging market';
  input.value = example;
  fetchInsights(example);
});

// Quick try free button behavior
const btnTry = document.getElementById('btn-try');
if(btnTry){
  btnTry.addEventListener('click', ()=>{ document.getElementById('search-input').focus(); });
}

// Build CTA
const btnBuild = document.getElementById('btn-build');
if(btnBuild){ btnBuild.addEventListener('click', ()=>{ alert('Build flow coming soon — this will scaffold an insight in 30 seconds.'); }); }

// Interactive Demo button
const btnDemo = document.getElementById('btn-demo');
if(btnDemo){ 
  btnDemo.addEventListener('click', ()=>{ 
    const demoQuery = 'Global SaaS analytics market';
    input.value = demoQuery;
    fetchInsights(demoQuery);
  }); 
}

// Capability button handlers
const capButtons = [
  { id: 'btn-competitors', tileId: 'competitors' },
  { id: 'btn-market', tileId: 'market' },
  { id: 'btn-monitoring', tileId: 'monitoring' },
  { id: 'btn-ai', tileId: 'ai' }
];

capButtons.forEach(({id, tileId}) => {
  const button = document.getElementById(id);
  if (button) {
    button.addEventListener('click', () => {
      console.log(`Button clicked: ${id}, tileId: ${tileId}`); // Debug
      console.log(`Current insightsData:`, insightsData); // Debug
      
      // Check if insights exist
      if (!insightsData[tileId]) {
        alert('Please generate insights first by entering a company or market and clicking "Generate insights"');
        return;
      }
      
      // Toggle active class
      const wasActive = button.classList.contains('active');
      
      // Remove active class from all buttons
      capButtons.forEach(({id: btnId}) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.remove('active');
      });
      
      const tile = document.getElementById(`tile-${tileId}`);
      
      if (wasActive) {
        // If was active, hide it
        if (tile) tile.style.display = 'none';
      } else {
        // Add active class to clicked button and show tile
        button.classList.add('active');
        hideAllTiles();
        showTile(tileId, insightsData[tileId]);
      }
    });
  }
});
