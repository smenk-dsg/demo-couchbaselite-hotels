/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable guard-for-in */
import { Injectable } from '@angular/core';
import {
  BasicAuthenticator,
  Database,
  DatabaseConfiguration,
  LogDomain,
  LogLevel,
  MutableDocument,
  Replicator,
  ReplicatorConfiguration,
  URLEndpoint
} from '@ionic-enterprise/couchbase-lite';
import { Hotel } from '../models/hotel';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private database: Database;
  private DOC_TYPE_HOTEL = 'hotel';
  private DOC_TYPE_BOOKMARKED_HOTELS = 'bookmarked_hotels';
  private replicator: Replicator;

  constructor() { }

  public async getHotels(): Promise<Hotel[]> {
    await this.initializeDatabase();

    return await this.retrieveHotelList();
  }

  public async initializeDatabase() {
    await this.seedInitialData();
  }

  private async seedInitialData() {
    console.log('Starting database');
    this.database = new Database('vaps');
    this.database.setLogLevel(LogDomain.REPLICATOR, LogLevel.VERBOSE);

    console.dir(this.database);
    await this.startReplication();
  }

  private async startReplication() {
    console.log('Starting Replication');
    // Create replicators to push and pull changes to and from the cloud.
    const targetEndpoint = new URLEndpoint('wss://jwx0ry9b4uxwrewq.apps.cloud.couchbase.com:4984/vaps');
    const replConfig = new ReplicatorConfiguration(this.database, targetEndpoint);
    replConfig.setReplicatorType(
      ReplicatorConfiguration.ReplicatorType.PULL,
    );

    // Add authentication.
    replConfig.setAuthenticator(new BasicAuthenticator('ionic', 'Dunn1234!'));

    // Create replicator.
    this.replicator = new Replicator(replConfig);

    // Listen to replicator change events.
    this.replicator.addChangeListener(change => {
      console.log('Replicator change event');
      console.dir(change);
    });

    // Start replication.
    await this.replicator.start();
    console.dir(await this.replicator.getStatus());
    console.dir(this.replicator);
  }

  private async retrieveHotelList(): Promise<Hotel[]> {
    // Get all hotels
    const hotelResults = this.getAllHotels();

    const hotelList: Hotel[] = [];
    for (const key in hotelResults) {
      // Couchbase can query multiple databases at once, so "_" is just this single database.
      // [ { "_": { id: "1", name: "Matt" } }, { "_": { id: "2", name: "Max" } }]
      const singleHotel = hotelResults[key]._ as Hotel;

      hotelList.push(singleHotel);
    }

    return hotelList;
  }

  private async getAllHotels() {
    const query = this.database.createQuery(`SELECT *`);
    const result = await query.execute();
    return await result.allResults();
  }
}
