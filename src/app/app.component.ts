import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { event as d3Event } from 'd3-selection';
import * as R from 'ramda';
import { tap } from 'rxjs/operators';
import { CountryDataModel } from './models/country-data';
import { AppService } from './services/app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private countryData: CountryDataModel;
  public countryDetails: string | undefined;

  constructor(private readonly appService: AppService) {}

  public ngOnInit(): void {
    this.appService
      .getData()
      .pipe(
        tap((countryData: CountryDataModel) => (this.countryData = countryData))
      )
      .subscribe();

    this.loadGlobe();
  }

  private loadGlobe(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const sensitivity = 75;

    const projection = d3
      .geoOrthographic()
      .scale(400)
      .center([0, 0])
      .rotate([0, -30])
      .translate([width / 2, height / 2]);

    const initialScale = projection.scale();
    let path = d3.geoPath().projection(projection);

    const svg = d3
      .select('#globe')
      .append('svg')
      .attr('width', width - 20)
      .attr('height', height - 20);

    const globe = svg
      .append('circle')
      .attr('fill', '#ADD8E6')
      .attr('stroke', '#000')
      .attr('stroke-width', '0.2')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', initialScale);

    svg
      .call(
        d3.drag().on('drag', (): void => {
          const rotate = projection.rotate();
          const k = sensitivity / projection.scale();
          projection.rotate([
            rotate[0] + d3Event.dx * k,
            rotate[1] - d3Event.dy * k,
          ]);
          path = d3.geoPath().projection(projection);
          svg.selectAll('path').attr('d', path);
        })
      )
      .call(
        d3.zoom().on('zoom', (): void => {
          if (d3Event.transform.k > 0.3) {
            projection.scale(initialScale * d3Event.transform.k);
            path = d3.geoPath().projection(projection);
            svg.selectAll('path').attr('d', path);
            globe.attr('r', projection.scale());
          } else {
            d3Event.transform.k = 0.3;
          }
        })
      );

    const map = svg.append('g');

    d3.json('assets/ne_110m_admin_0_countries.json', (err, d): void => {
      map
        .append('g')
        .attr('class', 'countries')
        .selectAll('path')
        .data(d.features)
        .enter()
        .append('path')
        .attr('class', (d: any) => 'country_' + d.properties.ISO_A2)
        .attr('d', path)
        .attr('fill', (d: any) =>
          this.getScoreColour(this.getCountryScore(d.properties.ISO_A2))
        )
        .style('stroke', 'black')
        .style('stroke-width', 0.3)
        .on('mouseleave', (d: any) => this.clearDetails())
        .on('mouseover', (d: any) =>
          this.showDetails(d.properties.ISO_A2, d.properties.NAME)
        );
    });
  }

  private getScoreColour(score: number | null, defaultColor = 'LightGray') {
    if (R.isNil(score) || Number.isNaN(score) || score > 10) {
      return defaultColor;
    }
    if (score <= 2.5) {
      return '#ce181f';
    }
    if (score <= 5) {
      return '#f47721';
    }
    if (score <= 7.5) {
      return '#ffc709';
    }
    return '#d6e040';
  }

  private getCountryScore(countryCode: string): number | undefined {
    const country = this.countryData[countryCode];
    if (country) {
      if (country.entitled == true) {
        return country.score;
      }
    }
  }

  private clearDetails(): void {
    this.countryDetails = undefined;
  }

  private showDetails(countryCode: string, countryName: string): void {
    const country = this.countryData[countryCode];
    if (!country) {
      this.countryDetails = undefined;
      return;
    }

    if (country.score !== undefined) {
      this.countryDetails = `${countryName}: ${country.score.toFixed(2)}`;
    }

    if (country.entitled == false) {
      this.countryDetails = null;
    }
  }
}
