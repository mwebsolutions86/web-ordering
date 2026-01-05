#!/usr/bin/env node

// Script de test de performance PWA pour Universal Eats
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  url: 'http://localhost:3000',
  outputDir: './performance-reports',
  thresholds: {
    performance: 90,
    accessibility: 90,
    bestPractices: 90,
    seo: 90,
    pwa: 100
  }
};

async function runPerformanceTest() {
  console.log('🚀 Démarrage des tests de performance PWA...');
  
  // Créer le dossier de sortie
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Test Lighthouse
    console.log('📊 Exécution du test Lighthouse...');
    const lighthouseResult = await runLighthouseTest(browser);
    
    // Test des performances personnalisées
    console.log('⚡ Test des métriques personnalisées...');
    const customMetrics = await runCustomMetricsTest(browser);
    
    // Test PWA
    console.log('📱 Test des fonctionnalités PWA...');
    const pwaFeatures = await runPWATest(browser);
    
    // Génération du rapport
    console.log('📝 Génération du rapport de performance...');
    const report = {
      timestamp: new Date().toISOString(),
      url: CONFIG.url,
      lighthouse: lighthouseResult,
      custom: customMetrics,
      pwa: pwaFeatures,
      score: calculateOverallScore(lighthouseResult, customMetrics)
    };
    
    await saveReport(report);
    await displayResults(report);
    
    return report;
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function runLighthouseTest(browser) {
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    port: new URL(browser.wsEndpoint()).port,
  };

  const runnerResult = await lighthouse(CONFIG.url, options);
  
  return {
    scores: {
      performance: Math.round(runnerResult.lhr.categories.performance.score * 100),
      accessibility: Math.round(runnerResult.lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(runnerResult.lhr.categories['best-practices'].score * 100),
      seo: Math.round(runnerResult.lhr.categories.seo.score * 100),
      pwa: Math.round(runnerResult.lhr.categories.pwa.score * 100)
    },
    metrics: {
      firstContentfulPaint: runnerResult.lhr.audits['first-contentful-paint'].numericValue,
      largestContentfulPaint: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,
      firstInputDelay: runnerResult.lhr.audits['max-potential-fid'].numericValue,
      cumulativeLayoutShift: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue,
      speedIndex: runnerResult.lhr.audits['speed-index'].numericValue
    },
    opportunities: runnerResult.lhr.audits,
    raw: runnerResult.lhr
  };
}

async function runCustomMetricsTest(browser) {
  const page = await browser.newPage();
  
  // Mesurer les temps de chargement
  const navigationPromise = page.waitForNavigation();
  await page.goto(CONFIG.url);
  await navigationPromise;
  
  // Attendre que la page soit complètement chargée
  await page.waitForSelector('body');
  
  const customMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    // Métriques personnalisées
    const metrics = {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      ttfb: navigation.responseStart - navigation.requestStart,
      firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      resourceTiming: performance.getEntriesByType('resource').map(resource => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize
      }))
    };
    
    // Test des interactions
    const testInteractions = async () => {
      // Test du scroll fluide
      const startTime = performance.now();
      await window.scrollTo({ top: 1000, behavior: 'smooth' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const scrollTime = performance.now() - startTime;
      
      // Test du responsive design
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      return {
        scrollPerformance: scrollTime,
        viewport,
        isResponsive: viewport.width <= 768 || viewport.width <= 1024
      };
    };
    
    return {
      ...metrics,
      interactions: testInteractions
    };
  });
  
  await page.close();
  return customMetrics;
}

async function runPWATest(browser) {
  const page = await browser.newPage();
  
  // Test du manifest
  const manifestCheck = await page.evaluate(async () => {
    try {
      const response = await fetch('/manifest.json');
      const manifest = await response.json();
      
      return {
        exists: true,
        valid: !!manifest.name && !!manifest.icons,
        hasShortcuts: !!(manifest.shortcuts && manifest.shortcuts.length > 0),
        hasThemeColor: !!manifest.theme_color,
        name: manifest.name,
        display: manifest.display,
        icons: manifest.icons?.length || 0
      };
    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: error.message
      };
    }
  });
  
  // Test du service worker
  const serviceWorkerCheck = await page.evaluate(() => {
    return {
      supported: 'serviceWorker' in navigator,
      registered: !!navigator.serviceWorker.controller,
      scope: navigator.serviceWorker.controller?.scope || null
    };
  });
  
  // Test des fonctionnalités PWA
  const featuresCheck = await page.evaluate(() => {
    const features = {
      webAppInstallable: 'beforeinstallprompt' in window,
      notificationSupported: 'Notification' in window,
      pushSupported: 'PushManager' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      offlineSupport: 'caches' in window,
      storagePersisted: 'storage' in navigator && 'persist' in navigator.storage
    };
    
    // Test de l'installation
    let installPromptAvailable = false;
    let installPromptEvent = null;
    
    const handleBeforeInstallPrompt = (e) => {
      installPromptAvailable = true;
      installPromptEvent = e;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return {
      ...features,
      installPromptAvailable,
      canBeInstalled: installPromptAvailable && !window.matchMedia('(display-mode: standalone)').matches
    };
  });
  
  // Test de la responsivité
  const responsiveCheck = await page.evaluate(() => {
    const breakpoints = [
      { name: 'mobile', width: 375 },
      { name: 'tablet', width: 768 },
      { name: 'desktop', width: 1024 },
      { name: 'large', width: 1440 }
    ];
    
    return breakpoints.map(bp => ({
      name: bp.name,
      width: bp.width,
      fits: window.innerWidth >= bp.width
    }));
  });
  
  await page.close();
  
  return {
    manifest: manifestCheck,
    serviceWorker: serviceWorkerCheck,
    features: featuresCheck,
    responsive: responsiveCheck
  };
}

function calculateOverallScore(lighthouseResult, customMetrics) {
  const weights = {
    performance: 0.4,
    accessibility: 0.2,
    bestPractices: 0.15,
    seo: 0.15,
    pwa: 0.1
  };
  
  const scores = lighthouseResult.scores;
  
  return Math.round(
    scores.performance * weights.performance +
    scores.accessibility * weights.accessibility +
    scores.bestPractices * weights.bestPractices +
    scores.seo * weights.seo +
    scores.pwa * weights.pwa
  );
}

async function saveReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `performance-report-${timestamp}.json`;
  const filepath = path.join(CONFIG.outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  
  // Sauvegarder aussi en format HTML pour visualisation
  const htmlReport = generateHTMLReport(report);
  const htmlFilename = `performance-report-${timestamp}.html`;
  const htmlFilepath = path.join(CONFIG.outputDir, htmlFilename);
  
  fs.writeFileSync(htmlFilepath, htmlReport);
  
  console.log(`📁 Rapports sauvegardés:`);
  console.log(`   JSON: ${filepath}`);
  console.log(`   HTML: ${htmlFilepath}`);
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Performance PWA - Universal Eats</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .score { font-size: 48px; font-weight: bold; color: #FF6B35; margin: 20px 0; }
        .score.grade-a { color: #10B981; }
        .score.grade-b { color: #3B82F6; }
        .score.grade-c { color: #F59E0B; }
        .score.grade-d { color: #EF4444; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .metric-title { font-weight: 600; color: #374151; margin-bottom: 10px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .metric-status { font-size: 14px; color: #6b7280; }
        .status-pass { color: #10B981; }
        .status-fail { color: #EF4444; }
        .pwa-features { margin: 30px 0; }
        .feature-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0; }
        .timestamp { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 Rapport de Performance PWA</h1>
            <h2>Universal Eats</h2>
            <div class="score ${getScoreClass(report.score)}">${report.score}/100</div>
            <p>Score global de performance</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">Performance</div>
                <div class="metric-value">${report.lighthouse.scores.performance}</div>
                <div class="metric-status ${report.lighthouse.scores.performance >= CONFIG.thresholds.performance ? 'status-pass' : 'status-fail'}">
                    ${report.lighthouse.scores.performance >= CONFIG.thresholds.performance ? '✅ Excellent' : '⚠️ À améliorer'}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Accessibilité</div>
                <div class="metric-value">${report.lighthouse.scores.accessibility}</div>
                <div class="metric-status ${report.lighthouse.scores.accessibility >= CONFIG.thresholds.accessibility ? 'status-pass' : 'status-fail'}">
                    ${report.lighthouse.scores.accessibility >= CONFIG.thresholds.accessibility ? '✅ Excellent' : '⚠️ À améliorer'}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Bonnes Pratiques</div>
                <div class="metric-value">${report.lighthouse.scores.bestPractices}</div>
                <div class="metric-status ${report.lighthouse.scores.bestPractices >= CONFIG.thresholds.bestPractices ? 'status-pass' : 'status-fail'}">
                    ${report.lighthouse.scores.bestPractices >= CONFIG.thresholds.bestPractices ? '✅ Excellent' : '⚠️ À améliorer'}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">SEO</div>
                <div class="metric-value">${report.lighthouse.scores.seo}</div>
                <div class="metric-status ${report.lighthouse.scores.seo >= CONFIG.thresholds.seo ? 'status-pass' : 'status-fail'}">
                    ${report.lighthouse.scores.seo >= CONFIG.thresholds.seo ? '✅ Excellent' : '⚠️ À améliorer'}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">PWA</div>
                <div class="metric-value">${report.lighthouse.scores.pwa}</div>
                <div class="metric-status ${report.lighthouse.scores.pwa >= CONFIG.thresholds.pwa ? 'status-pass' : 'status-fail'}">
                    ${report.lighthouse.scores.pwa >= CONFIG.thresholds.pwa ? '✅ Excellent' : '⚠️ À améliorer'}
                </div>
            </div>
        </div>

        <div class="pwa-features">
            <h3>🔧 Fonctionnalités PWA</h3>
            <div class="feature-item">
                <span>Manifest PWA</span>
                <span>${report.pwa.manifest.exists ? '✅ Configuré' : '❌ Manquant'}</span>
            </div>
            <div class="feature-item">
                <span>Service Worker</span>
                <span>${report.pwa.serviceWorker.registered ? '✅ Enregistré' : '❌ Non enregistré'}</span>
            </div>
            <div class="feature-item">
                <span>Installation possible</span>
                <span>${report.pwa.features.canBeInstalled ? '✅ Oui' : '❌ Non'}</span>
            </div>
            <div class="feature-item">
                <span>Notifications Push</span>
                <span>${report.pwa.features.notificationSupported ? '✅ Supportées' : '❌ Non supportées'}</span>
            </div>
        </div>

        <div class="recommendations">
            <h3>💡 Recommandations d'optimisation</h3>
            <ul>
                ${generateRecommendations(report)}
            </ul>
        </div>

        <div class="timestamp">
            Rapport généré le ${new Date(report.timestamp).toLocaleString('fr-FR')}
        </div>
    </div>
</body>
</html>
`;
}

function getScoreClass(score) {
  if (score >= 90) return 'grade-a';
  if (score >= 80) return 'grade-b';
  if (score >= 70) return 'grade-c';
  return 'grade-d';
}

function generateRecommendations(report) {
  const recommendations = [];
  
  if (report.lighthouse.scores.performance < CONFIG.thresholds.performance) {
    recommendations.push('<li>Optimiser les images et utiliser WebP/AVIF</li>');
    recommendations.push('<li>Activer la compression gzip/brotli</li>');
    recommendations.push('<li>Minimiser le JavaScript et utiliser le code splitting</li>');
  }
  
  if (report.lighthouse.scores.pwa < CONFIG.thresholds.pwa) {
    recommendations.push('<li>Configurer correctement le manifest.json</li>');
    recommendations.push('<li>Implémenter un service worker robuste</li>');
    recommendations.push('<li>Ajouter des icônes adaptatives</li>');
  }
  
  if (report.custom.domContentLoaded > 2000) {
    recommendations.push('<li>Réduire le temps de chargement initial</li>');
    recommendations.push('<li>Utiliser le lazy loading pour les composants</li>');
  }
  
  return recommendations.length > 0 ? recommendations.join('') : '<li>Aucune recommandation spécifique - Performance optimale ! 🎉</li>';
}

async function displayResults(report) {
  console.log('\n📊 RÉSULTATS DES TESTS DE PERFORMANCE');
  console.log('=====================================');
  
  console.log(`\n🎯 Score global: ${report.score}/100`);
  
  console.log('\n📈 Scores Lighthouse:');
  console.log(`   Performance: ${report.lighthouse.scores.performance}/100 ${report.lighthouse.scores.performance >= CONFIG.thresholds.performance ? '✅' : '⚠️'}`);
  console.log(`   Accessibilité: ${report.lighthouse.scores.accessibility}/100 ${report.lighthouse.scores.accessibility >= CONFIG.thresholds.accessibility ? '✅' : '⚠️'}`);
  console.log(`   Bonnes pratiques: ${report.lighthouse.scores.bestPractices}/100 ${report.lighthouse.scores.bestPractices >= CONFIG.thresholds.bestPractices ? '✅' : '⚠️'}`);
  console.log(`   SEO: ${report.lighthouse.scores.seo}/100 ${report.lighthouse.scores.seo >= CONFIG.thresholds.seo ? '✅' : '⚠️'}`);
  console.log(`   PWA: ${report.lighthouse.scores.pwa}/100 ${report.lighthouse.scores.pwa >= CONFIG.thresholds.pwa ? '✅' : '⚠️'}`);
  
  console.log('\n⚡ Métriques clés:');
  console.log(`   First Contentful Paint: ${Math.round(report.lighthouse.metrics.firstContentfulPaint)}ms`);
  console.log(`   Largest Contentful Paint: ${Math.round(report.lighthouse.metrics.largestContentfulPaint)}ms`);
  console.log(`   First Input Delay: ${Math.round(report.lighthouse.metrics.firstInputDelay)}ms`);
  console.log(`   Cumulative Layout Shift: ${report.lighthouse.metrics.cumulativeLayoutShift.toFixed(3)}`);
  
  console.log('\n📱 Fonctionnalités PWA:');
  console.log(`   Manifest: ${report.pwa.manifest.exists ? '✅' : '❌'}`);
  console.log(`   Service Worker: ${report.pwa.serviceWorker.registered ? '✅' : '❌'}`);
  console.log(`   Installable: ${report.pwa.features.canBeInstalled ? '✅' : '❌'}`);
  console.log(`   Notifications: ${report.pwa.features.notificationSupported ? '✅' : '❌'}`);
  
  // Vérifier si tous les seuils sont atteints
  const allPassed = Object.entries(CONFIG.thresholds).every(([category, threshold]) => {
    return report.lighthouse.scores[category] >= threshold;
  });
  
  if (allPassed) {
    console.log('\n🎉 Félicitations ! Tous les seuils de performance sont atteints.');
  } else {
    console.log('\n⚠️ Certains seuils ne sont pas atteints. Consultez le rapport pour les recommandations.');
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runPerformanceTest()
    .then(() => {
      console.log('\n✅ Tests de performance terminés avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Échec des tests de performance:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTest, CONFIG };