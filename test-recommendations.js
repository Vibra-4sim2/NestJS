/**
 * Script de test pour vérifier le fonctionnement du système de recommandations Python.
 * Utilisation: node test-recommendations.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Données de test
const testData = {
  userPreferences: {
    onboardingComplete: true,
    level: "INTERMEDIATE",
    cyclingType: "ROAD",
    cyclingFrequency: "WEEKLY",
    cyclingDistance: "20_50",
    cyclingGroupInterest: true,
    hikeType: "MOUNTAIN",
    hikeDuration: "HALF_DAY",
    hikePreference: "NATURE",
    campingPractice: true,
    campingType: "TENT",
    campingDuration: "WEEKEND",
    availableDays: "SATURDAY|SUNDAY",
    start: "09:00",
    end: "18:00",
    latitude: 48.8566,
    longitude: 2.3522,
    averageSpeed: 20
  },
  sorties: [
    {
      id: "1",
      type: "VELO",
      difficulte: "MOYEN",
      date: "2025-12-01T10:00:00.000Z",
      option_camping: false,
      camping: false,
      capacite: 10,
      distance: 35,
      duree_estimee: 2.5,
      depart_lat: 48.8566,
      depart_lon: 2.3522,
      arrivee_lat: 48.9000,
      arrivee_lon: 2.4000
    },
    {
      id: "2",
      type: "RANDONNEE",
      difficulte: "FACILE",
      date: "2025-12-05T09:00:00.000Z",
      option_camping: true,
      camping: true,
      capacite: 8,
      distance: 12,
      duree_estimee: 4,
      depart_lat: 48.7000,
      depart_lon: 2.2000,
      arrivee_lat: 48.7200,
      arrivee_lon: 2.2300
    },
    {
      id: "3",
      type: "VELO",
      difficulte: "DIFFICILE",
      date: "2025-12-10T08:00:00.000Z",
      option_camping: false,
      camping: false,
      capacite: 15,
      distance: 60,
      duree_estimee: 3.5,
      depart_lat: 48.8000,
      depart_lon: 2.3000,
      arrivee_lat: 49.0000,
      arrivee_lon: 2.5000
    }
  ]
};

console.log('🚀 Test du système de recommandations Python\n');
console.log('📊 Données de test:');
console.log(`   - Utilisateur: niveau ${testData.userPreferences.level}`);
console.log(`   - ${testData.sorties.length} sorties à analyser\n`);

// Lancer le script Python
const scriptPath = path.join(__dirname, 'src', 'ai', 'recommendation_runner.py');
console.log(`📝 Lancement du script: ${scriptPath}\n`);

const pythonProcess = spawn('python', [scriptPath]);

let output = '';
let errorOutput = '';

pythonProcess.stdout.on('data', (data) => {
  output += data.toString();
});

pythonProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.error('⚠️  Stderr:', data.toString());
});

pythonProcess.on('close', (code) => {
  console.log(`\n✅ Processus terminé avec le code: ${code}\n`);
  
  if (code === 0) {
    try {
      const result = JSON.parse(output);
      console.log('📈 Résultats:');
      console.log('   Cluster utilisateur:', result.userCluster);
      console.log('   Sorties analysées:', result.sortiesWithClusters.length);
      console.log('   Recommandations:', result.matchedSortieIds.length);
      console.log('\n📋 Détail des clusters:');
      result.sortiesWithClusters.forEach((s, i) => {
        const matched = result.matchedSortieIds.includes(s.id) ? '✓' : '✗';
        console.log(`   ${matched} Sortie ${s.id}: cluster ${s.cluster}`);
      });
      console.log('\n🎯 IDs des sorties recommandées:', result.matchedSortieIds);
      console.log('\n✨ Test réussi!');
    } catch (error) {
      console.error('❌ Erreur lors du parsing du résultat:', error.message);
      console.error('Output reçu:', output);
    }
  } else {
    console.error('❌ Erreur lors de l\'exécution du script Python');
    if (errorOutput) {
      console.error('Détails:', errorOutput);
    }
  }
});

pythonProcess.on('error', (error) => {
  console.error('❌ Impossible de lancer le processus Python:', error.message);
  console.error('\n💡 Vérifiez que Python est installé et dans le PATH.');
  console.error('   Commande de test: python --version');
});

// Envoyer les données au script
try {
  const jsonPayload = JSON.stringify(testData);
  pythonProcess.stdin.write(jsonPayload);
  pythonProcess.stdin.end();
} catch (error) {
  console.error('❌ Erreur lors de l\'écriture dans stdin:', error.message);
  pythonProcess.kill();
}
