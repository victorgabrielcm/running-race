#!/usr/bin/env python3
import json, os, urllib.request, urllib.parse
from datetime import datetime

def get_access_token():
    data = urllib.parse.urlencode({
        'client_id': os.environ['STRAVA_CLIENT_ID'],
        'client_secret': os.environ['STRAVA_CLIENT_SECRET'],
        'refresh_token': os.environ['STRAVA_REFRESH_TOKEN'],
        'grant_type': 'refresh_token',
    }).encode()
    req = urllib.request.Request('https://www.strava.com/oauth/token', data=data)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())['access_token']

def fetch_all(token):
    activities, page = [], 1
    while True:
        url = f'https://www.strava.com/api/v3/athlete/activities?per_page=200&page={page}'
        req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req) as r:
            batch = json.loads(r.read())
        if not batch: break
        activities.extend(batch)
        page += 1
        if len(batch) < 200: break
    return activities

def fmt_time(s):
    h,m,sec = s//3600,(s%3600)//60,s%60
    return f'{h}:{m:02d}:{sec:02d}' if h>0 else f'{m}:{sec:02d}'

def fmt_pace(s, dm):
    if dm<=0: return None
    p=(s/dm)*1000; return f'{int(p//60)}:{int(p%60):02d}/km'

def classify(km):
    if 4.5<=km<=5.5: return '5k'
    if 9<=km<=11: return '10k'
    if 20<=km<=22: return 'half'
    if 41<=km<=43: return 'marathon'
    return None

def main():
    path = 'data/races.json'
    existing = {}
    if os.path.exists(path):
        with open(path,encoding='utf-8') as f: old=json.load(f)
        for r in old.get('races',[]): existing[str(r['id'])]=r

    token = get_access_token()
    activities = fetch_all(token)
    runs = [a for a in activities if a.get('type') in ('Run','Race','VirtualRun')]
    print(f'{len(runs)} corridas encontradas')

    races, total_km, best = [], 0.0, {}
    for a in runs:
        old = existing.get(str(a['id']),{})
        km = round(a['distance']/1000,2); total_km+=km
        race = {
            'id':a['id'],'name':a['name'],'date':a['start_date_local'][:10],
            'distance_km':km,'distance_class':classify(km),
            'moving_time_seconds':a['moving_time'],'elapsed_time_seconds':a['elapsed_time'],
            'moving_time_formatted':fmt_time(a['moving_time']),
            'pace':fmt_pace(a['moving_time'],a['distance']),
            'average_heartrate':a.get('average_heartrate'),
            'max_heartrate':a.get('max_heartrate'),
            'total_elevation_gain':round(a.get('total_elevation_gain',0),1),
            'map_polyline':a.get('map',{}).get('summary_polyline',''),
            'strava_url':f'https://www.strava.com/activities/{a["id"]}',
            'type':a.get('type','Run'),
            'has_medal':old.get('has_medal',False),
            'medal_image':old.get('medal_image',None),
            'bib_number':old.get('bib_number',None),
            'bib_event':old.get('bib_event',None),
            'photos':old.get('photos',[]),
            'notes':old.get('notes',''),
            'is_featured':old.get('is_featured',False),
        }
        races.append(race)
        dc=race['distance_class']
        if dc:
            cur=best.get(dc)
            if not cur or race['moving_time_seconds']<cur['seconds']:
                best[dc]={'seconds':race['moving_time_seconds'],'formatted':race['moving_time_formatted'],'race_name':race['name'],'date':race['date']}

    races.sort(key=lambda x:x['date'],reverse=True)
    output = {
        'last_updated':datetime.utcnow().isoformat()+'Z',
        'athlete':{'name':'Victor Gabriel','username':'vcardosodemorais',
            'stats':{'total_km':round(total_km,1),'total_races':len(races),
                     'total_medals':sum(1 for r in races if r['has_medal']),'best_times':best}},
        'races':races
    }
    os.makedirs('data',exist_ok=True)
    with open(path,'w',encoding='utf-8') as f: json.dump(output,f,indent=2,ensure_ascii=False)
    print(f'OK: {len(races)} corridas, {round(total_km,1)}km')

if __name__=='__main__': main()
