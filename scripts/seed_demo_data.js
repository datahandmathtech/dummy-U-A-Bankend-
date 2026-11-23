const mongoose = require('mongoose');

const SOURCE_URI = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/Unnati-arts?ssl=true&replicaSet=atlas-icn4hi-shard-0&authSource=admin&retryWrites=true&w=majority&readPreference=primary';
const TARGET_URI = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/Unnati-Arts-Demo?ssl=true&replicaSet=atlas-icn4hi-shard-0&authSource=admin&retryWrites=true&w=majority&readPreference=primary';

async function seed() {
  console.log('Connecting to Source & Target DBs...');
  const srcConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  const tgtConn = await mongoose.createConnection(TARGET_URI).asPromise();
  const srcDb = srcConn.db;
  const tgtDb = tgtConn.db;

  // 1. Master Collections to copy completely
  const masterCollections = [
    'User',
    'UnitCategory',
    'ProductCategory',
    'Machine',
    'Vendor',
    'QuotationTerm'
  ];

  for (const colName of masterCollections) {
    const docs = await srcDb.collection(colName).find({}).toArray();
    await tgtDb.collection(colName).deleteMany({});
    if (docs.length > 0) {
      await tgtDb.collection(colName).insertMany(docs);
    }
    console.log(`Copied ${docs.length} records to ${colName}`);
  }

  // Ensure demo admin user exists in target
  const existingDemoUser = await tgtDb.collection('User').findOne({ email: 'admin@demo.com' });
  if (!existingDemoUser) {
    const adminUser = await srcDb.collection('User').findOne({ role: 'admin' });
    if (adminUser) {
      const demoUser = { ...adminUser, _id: new mongoose.Types.ObjectId(), email: 'admin@demo.com', name: 'Admin User' };
      await tgtDb.collection('User').insertOne(demoUser);
      console.log('Created admin@demo.com user in target DB');
    }
  }

  // 2. Inventory (Sample top 25 items)
  const invDocs = await srcDb.collection('Inventory').find({}).limit(25).toArray();
  await tgtDb.collection('Inventory').deleteMany({});
  if (invDocs.length > 0) {
    await tgtDb.collection('Inventory').insertMany(invDocs);
  }
  console.log(`Copied ${invDocs.length} inventory records to Inventory`);

  // 3. Select 2 Real Active Projects
  const projectIds = ['6afff92811e943f7918f32a3', '6b040fd9f9d360c27123614d'];
  const projObjIds = projectIds.map(id => new mongoose.Types.ObjectId(id));

  const projects = await srcDb.collection('Project').find({
    $or: [
      { _id: { $in: projObjIds } },
      { _id: { $in: projectIds } }
    ]
  }).toArray();

  await tgtDb.collection('Project').deleteMany({});
  if (projects.length > 0) {
    await tgtDb.collection('Project').insertMany(projects);
  }
  console.log(`Copied ${projects.length} sample active projects to Project: ${projects.map(p => p.name).join(', ')}`);

  // 4. Slabs for these 2 projects
  const slabs = await srcDb.collection('Slab').find({
    $or: [
      { projectId: { $in: projectIds } },
      { projectId: { $in: projObjIds } }
    ]
  }).toArray();
  const slabIds = slabs.map(s => s._id.toString());
  const slabObjIds = slabs.map(s => s._id);

  await tgtDb.collection('Slab').deleteMany({});
  if (slabs.length > 0) {
    await tgtDb.collection('Slab').insertMany(slabs);
  }
  console.log(`Copied ${slabs.length} slabs to Slab`);

  // 5. Pieces for these slabs
  const pieces = await srcDb.collection('Piece').find({
    $or: [
      { slabId: { $in: slabIds } },
      { slabId: { $in: slabObjIds } }
    ]
  }).toArray();
  const pieceIds = pieces.map(p => p._id.toString());
  const pieceObjIds = pieces.map(p => p._id);

  await tgtDb.collection('Piece').deleteMany({});
  if (pieces.length > 0) {
    await tgtDb.collection('Piece').insertMany(pieces);
  }
  console.log(`Copied ${pieces.length} pieces to Piece`);

  // 6. PieceLogs
  const pieceLogs = await srcDb.collection('PieceLog').find({
    $or: [
      { pieceId: { $in: pieceIds } },
      { pieceId: { $in: pieceObjIds } }
    ]
  }).toArray();

  await tgtDb.collection('PieceLog').deleteMany({});
  if (pieceLogs.length > 0) {
    await tgtDb.collection('PieceLog').insertMany(pieceLogs);
  }
  console.log(`Copied ${pieceLogs.length} piece logs to PieceLog`);

  // 7. ProductionLogs
  const prodLogs = await srcDb.collection('ProductionLog').find({
    $or: [
      { projectId: { $in: projectIds } },
      { projectId: { $in: projObjIds } },
      { slabId: { $in: slabIds } },
      { slabId: { $in: slabObjIds } }
    ]
  }).toArray();

  await tgtDb.collection('ProductionLog').deleteMany({});
  if (prodLogs.length > 0) {
    await tgtDb.collection('ProductionLog').insertMany(prodLogs);
  }
  console.log(`Copied ${prodLogs.length} production logs to ProductionLog`);

  // 8. Quotations
  const quotes = await srcDb.collection('Quotation').find({
    $or: [
      { projectId: { $in: projectIds } },
      { projectId: { $in: projObjIds } }
    ]
  }).toArray();

  await tgtDb.collection('Quotation').deleteMany({});
  if (quotes.length > 0) {
    await tgtDb.collection('Quotation').insertMany(quotes);
  }
  console.log(`Copied ${quotes.length} quotations to Quotation`);

  // 9. ShopDrawings
  const drawings = await srcDb.collection('ShopDrawing').find({
    $or: [
      { projectId: { $in: projectIds } },
      { projectId: { $in: projObjIds } }
    ]
  }).toArray();

  await tgtDb.collection('ShopDrawing').deleteMany({});
  if (drawings.length > 0) {
    await tgtDb.collection('ShopDrawing').insertMany(drawings);
  }
  console.log(`Copied ${drawings.length} shop drawings to ShopDrawing`);

  // 10. ProjectMaterials
  const mats = await srcDb.collection('ProjectMaterial').find({
    $or: [
      { projectId: { $in: projectIds } },
      { projectId: { $in: projObjIds } }
    ]
  }).toArray();

  await tgtDb.collection('ProjectMaterial').deleteMany({});
  if (mats.length > 0) {
    await tgtDb.collection('ProjectMaterial').insertMany(mats);
  }
  console.log(`Copied ${mats.length} materials to ProjectMaterial`);

  console.log('\n--- SUCCESS: Unnati-Arts-Demo Database Seeded Successfully! ---');
  await srcConn.close();
  await tgtConn.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
