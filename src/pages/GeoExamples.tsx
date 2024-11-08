// Next imports:
import { NextPage } from "next";

import chroma from "chroma-js";

import React, { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "three-stdlib";
import * as THREE from "three";

const CustomOrbitControls: React.FC = () => {
  const { camera, gl } = useThree();

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    return () => {
      controls.dispose();
    };
  }, [camera, gl]);

  return null;
};

interface GeohashBarProps {
  position: [number, number, number];
  frequency: number;
  intensity: number;
}

const redYellowGreen = chroma.scale(["red", "yellow", "green"]);

const GeohashBar: React.FC<GeohashBarProps> = ({
  position,
  frequency,
  intensity,
}) => {
  const height = frequency;
  const color = new THREE.Color(
    `hsl(${Math.max(0, 240 - intensity * 240)}, 100%, 50%)`
  );
  const cbbColor = new THREE.Color(
    redYellowGreen.domain([0.3, 0.5, 0.7])(intensity).hex()
  );

  return (
    <mesh position={position}>
      <boxGeometry args={[0.5, height, 0.5]} />
      <meshStandardMaterial color={cbbColor} />
    </mesh>
  );
};

interface DataPoint {
  x: number;
  y: number;
  frequency: number;
  intensity: number;
}

interface ThreeDBarChartProps {
  data: DataPoint[];
}

const ThreeDBarChart: React.FC<ThreeDBarChartProps> = ({ data }) => {
  return (
    <Canvas
      style={{ width: "1200px", height: "800px" }}
      camera={{ position: [10, 10, 10], fov: 50 }}
    >
      <ambientLight intensity={1.5} />
      <pointLight position={[30, 30, 30]} />
      <CustomOrbitControls />

      {/* Map over data and create bars */}
      {data.map((item, index) => {
        const { x, y, frequency, intensity } = item;
        return (
          <GeohashBar
            key={index}
            position={[x, frequency / 2, y]} // Center bars on ground level
            frequency={frequency}
            intensity={intensity}
          />
        );
      })}
    </Canvas>
  );
};

const GeoExamples: NextPage<{}> = ({}) => {
  const plotData: DataPoint[] = (
    testData?.aggregations?.shot_chart?.buckets || []
  ).map((shotInfo) => {
    const x = shotInfo.center.location.x;
    const y = shotInfo.center.location.y;
    const frequency = Math.sqrt(
      shotInfo.doc_count * Math.log(shotInfo.doc_count)
    );
    const intensity = shotInfo.total_pts.value / shotInfo.doc_count;

    return {
      x,
      y,
      frequency,
      intensity,
    };
  });

  return (
    <div className="App">
      <h1>3D Geohash Bar Chart</h1>
      <ThreeDBarChart data={plotData} />
    </div>
  );
};
export default GeoExamples;

const testData = {
  took: 48,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 3676,
      relation: "eq",
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    shot_chart: {
      buckets: [
        {
          key: "dr5ru4rewy",
          doc_count: 120,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 0.07083333333333333,
            },
            count: 120,
          },
          total_pts: {
            value: 140,
          },
          avg_dist: {
            value: 0.664388985435168,
          },
        },
        {
          key: "dr5ru4rexn",
          doc_count: 68,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 0.2426470588235294,
            },
            count: 68,
          },
          total_pts: {
            value: 86,
          },
          avg_dist: {
            value: 1.617477618596133,
          },
        },
        {
          key: "dr5ru4rexq",
          doc_count: 49,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 0.2653061224489796,
            },
            count: 49,
          },
          total_pts: {
            value: 68,
          },
          avg_dist: {
            value: 2.5460660311640524,
          },
        },
        {
          key: "dr5ru4reww",
          doc_count: 40,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 0.1625,
            },
            count: 40,
          },
          total_pts: {
            value: 56,
          },
          avg_dist: {
            value: 0.39200594574213027,
          },
        },
        {
          key: "dr5ru4rexp",
          doc_count: 33,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 1,
            },
            count: 33,
          },
          total_pts: {
            value: 48,
          },
          avg_dist: {
            value: 1.8698662519454956,
          },
        },
        {
          key: "dr5ru4rexw",
          doc_count: 32,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 0.234375,
            },
            count: 32,
          },
          total_pts: {
            value: 32,
          },
          avg_dist: {
            value: 3.476847104728222,
          },
        },
        {
          key: "dr5ru4rexh",
          doc_count: 29,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -1,
            },
            count: 29,
          },
          total_pts: {
            value: 34,
          },
          avg_dist: {
            value: 1.8698662519454956,
          },
        },
        {
          key: "dr5ru4rez0",
          doc_count: 27,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 1.5,
            },
            count: 27,
          },
          total_pts: {
            value: 40,
          },
          avg_dist: {
            value: 2.1786234378814697,
          },
        },
        {
          key: "dr5ru4rex1",
          doc_count: 27,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -2.685185185185185,
            },
            count: 27,
          },
          total_pts: {
            value: 22,
          },
          avg_dist: {
            value: 3.1178767769425004,
          },
        },
        {
          key: "dr5ru4rez1",
          doc_count: 23,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 2,
            },
            count: 23,
          },
          total_pts: {
            value: 24,
          },
          avg_dist: {
            value: 2.5488035678863525,
          },
        },
        {
          key: "dr5ru4rex9",
          doc_count: 23,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -2.717391304347826,
            },
            count: 23,
          },
          total_pts: {
            value: 24,
          },
          avg_dist: {
            value: 4.403806810793669,
          },
        },
        {
          key: "dr5ru4rewz",
          doc_count: 23,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 1,
            },
            count: 23,
          },
          total_pts: {
            value: 26,
          },
          avg_dist: {
            value: 1.1872657537460327,
          },
        },
        {
          key: "dr5ru4rg8n",
          doc_count: 22,
          center: {
            location: {
              x: 5.340000152587891,
              y: 0.1590909090909091,
            },
            count: 22,
          },
          total_pts: {
            value: 18,
          },
          avg_dist: {
            value: 5.347431898117065,
          },
        },
        {
          key: "dr5ru4rez4",
          doc_count: 22,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 2.5,
            },
            count: 22,
          },
          total_pts: {
            value: 22,
          },
          avg_dist: {
            value: 2.9574313163757324,
          },
        },
        {
          key: "dr5ru4rexk",
          doc_count: 21,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -1,
            },
            count: 21,
          },
          total_pts: {
            value: 22,
          },
          avg_dist: {
            value: 2.7111620903015137,
          },
        },
        {
          key: "dr5ru4rexy",
          doc_count: 20,
          center: {
            location: {
              x: 4.400000095367432,
              y: 0.275,
            },
            count: 20,
          },
          total_pts: {
            value: 16,
          },
          avg_dist: {
            value: 4.415574955940246,
          },
        },
        {
          key: "dr5ru4rext",
          doc_count: 20,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -0.5,
            },
            count: 20,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 3.4959404468536377,
          },
        },
        {
          key: "dr5ru4rexr",
          doc_count: 20,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 1,
            },
            count: 20,
          },
          total_pts: {
            value: 22,
          },
          avg_dist: {
            value: 2.7111620903015137,
          },
        },
        {
          key: "dr5ru4rexj",
          doc_count: 20,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -0.5,
            },
            count: 20,
          },
          total_pts: {
            value: 28,
          },
          avg_dist: {
            value: 1.6572265625,
          },
        },
        {
          key: "dr5ru4rg8q",
          doc_count: 19,
          center: {
            location: {
              x: 6.28000020980835,
              y: 0.2631578947368421,
            },
            count: 19,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 6.290459507390072,
          },
        },
        {
          key: "dr5ru4rez9",
          doc_count: 18,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 2,
            },
            count: 18,
          },
          total_pts: {
            value: 20,
          },
          avg_dist: {
            value: 3.996448516845703,
          },
        },
        {
          key: "dr5ru4rez3",
          doc_count: 18,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 2,
            },
            count: 18,
          },
          total_pts: {
            value: 18,
          },
          avg_dist: {
            value: 3.2172038555145264,
          },
        },
        {
          key: "dr5ru4rez2",
          doc_count: 18,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 1.5,
            },
            count: 18,
          },
          total_pts: {
            value: 18,
          },
          avg_dist: {
            value: 2.9326438903808594,
          },
        },
        {
          key: "dr5ru4rewv",
          doc_count: 18,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -0.5,
            },
            count: 18,
          },
          total_pts: {
            value: 30,
          },
          avg_dist: {
            value: 0.8121576309204102,
          },
        },
        {
          key: "dr5ru4rez6",
          doc_count: 17,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 2.5,
            },
            count: 17,
          },
          total_pts: {
            value: 20,
          },
          avg_dist: {
            value: 3.5497043132781982,
          },
        },
        {
          key: "dr5ru4rex3",
          doc_count: 17,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -2.7058823529411766,
            },
            count: 17,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 3.701338487512925,
          },
        },
        {
          key: "dr5ru4rexm",
          doc_count: 16,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -0.5,
            },
            count: 16,
          },
          total_pts: {
            value: 18,
          },
          avg_dist: {
            value: 2.569124460220337,
          },
        },
        {
          key: "dr5ru4rexd",
          doc_count: 16,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -2,
            },
            count: 16,
          },
          total_pts: {
            value: 20,
          },
          avg_dist: {
            value: 3.996448516845703,
          },
        },
        {
          key: "dr5ru4rg9n",
          doc_count: 15,
          center: {
            location: {
              x: 9.100000381469727,
              y: 0.26666666666666666,
            },
            count: 15,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 9.107320531209309,
          },
        },
        {
          key: "dr5ru4rfdz",
          doc_count: 15,
          center: {
            location: {
              x: 15.680000305175781,
              y: -18.133333333333333,
            },
            count: 15,
          },
          total_pts: {
            value: 21,
          },
          avg_dist: {
            value: 23.972920099894207,
          },
        },
        {
          key: "dr5ru4rez5",
          doc_count: 15,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 3.2,
            },
            count: 15,
          },
          total_pts: {
            value: 18,
          },
          avg_dist: {
            value: 3.570422077178955,
          },
        },
        {
          key: "dr5ru4rexz",
          doc_count: 15,
          center: {
            location: {
              x: 4.400000095367432,
              y: 1,
            },
            count: 15,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 4.512205600738525,
          },
        },
        {
          key: "dr5ru4reze",
          doc_count: 14,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 3.3214285714285716,
            },
            count: 14,
          },
          total_pts: {
            value: 18,
          },
          avg_dist: {
            value: 4.799377168927874,
          },
        },
        {
          key: "dr5ru4rez7",
          doc_count: 14,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 3.25,
            },
            count: 14,
          },
          total_pts: {
            value: 20,
          },
          avg_dist: {
            value: 4.1153883934021,
          },
        },
        {
          key: "dr5ru4reyb",
          doc_count: 14,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 1.5,
            },
            count: 14,
          },
          total_pts: {
            value: 20,
          },
          avg_dist: {
            value: 1.6308280229568481,
          },
        },
        {
          key: "dr5ru4rexc",
          doc_count: 14,
          center: {
            location: {
              x: 4.400000095367432,
              y: -2.607142857142857,
            },
            count: 14,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 5.117370503289359,
          },
        },
        {
          key: "dr5ru4rex5",
          doc_count: 14,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -1.5,
            },
            count: 14,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 2.1786234378814697,
          },
        },
        {
          key: "dr5ru4rewt",
          doc_count: 14,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -0.5,
            },
            count: 14,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 0.5830951929092407,
          },
        },
        {
          key: "dr5ru4rewn",
          doc_count: 14,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 0.2857142857142857,
            },
            count: 14,
          },
          total_pts: {
            value: 20,
          },
          avg_dist: {
            value: 1.2954351902008057,
          },
        },
        {
          key: "dr5ru4rezf",
          doc_count: 13,
          center: {
            location: {
              x: 4.400000095367432,
              y: 2.5,
            },
            count: 13,
          },
          total_pts: {
            value: 22,
          },
          avg_dist: {
            value: 5.060632228851318,
          },
        },
        {
          key: "dr5ru4rezb",
          doc_count: 13,
          center: {
            location: {
              x: 4.400000095367432,
              y: 1.5,
            },
            count: 13,
          },
          total_pts: {
            value: 16,
          },
          avg_dist: {
            value: 4.648655891418457,
          },
        },
        {
          key: "dr5ru4rexx",
          doc_count: 13,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 1,
            },
            count: 13,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 3.6016106605529785,
          },
        },
        {
          key: "dr5ru4rex4",
          doc_count: 13,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -2,
            },
            count: 13,
          },
          total_pts: {
            value: 18,
          },
          avg_dist: {
            value: 2.5488035678863525,
          },
        },
        {
          key: "dr5ru4rewf",
          doc_count: 13,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -2,
            },
            count: 13,
          },
          total_pts: {
            value: 20,
          },
          avg_dist: {
            value: 2.099904775619507,
          },
        },
        {
          key: "dr5ru4rg84",
          doc_count: 12,
          center: {
            location: {
              x: 5.340000152587891,
              y: -2,
            },
            count: 12,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 5.702245235443115,
          },
        },
        {
          key: "dr5ru4rezd",
          doc_count: 12,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 2.5,
            },
            count: 12,
          },
          total_pts: {
            value: 16,
          },
          avg_dist: {
            value: 4.2686767578125,
          },
        },
        {
          key: "dr5ru4rgb1",
          doc_count: 11,
          center: {
            location: {
              x: 5.340000152587891,
              y: 2,
            },
            count: 11,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 5.702245235443115,
          },
        },
        {
          key: "dr5ru4rg8y",
          doc_count: 11,
          center: {
            location: {
              x: 8.15999984741211,
              y: 0.3181818181818182,
            },
            count: 11,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 8.16973911632191,
          },
        },
        {
          key: "dr5ru4rg8w",
          doc_count: 11,
          center: {
            location: {
              x: 7.21999979019165,
              y: 0.3181818181818182,
            },
            count: 11,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 7.231004108082164,
          },
        },
        {
          key: "dr5ru4rg8j",
          doc_count: 11,
          center: {
            location: {
              x: 5.340000152587891,
              y: -0.5,
            },
            count: 11,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 5.363357067108154,
          },
        },
        {
          key: "dr5ru4rexv",
          doc_count: 11,
          center: {
            location: {
              x: 4.400000095367432,
              y: -0.5,
            },
            count: 11,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 4.428318023681641,
          },
        },
        {
          key: "dr5ru4rex7",
          doc_count: 11,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -1.5,
            },
            count: 11,
          },
          total_pts: {
            value: 18,
          },
          avg_dist: {
            value: 2.9326438903808594,
          },
        },
        {
          key: "dr5ru4rew9",
          doc_count: 11,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -2.6363636363636362,
            },
            count: 11,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 2.6534885493191807,
          },
        },
        {
          key: "dr5ru4rsye",
          doc_count: 10,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 22.3,
            },
            count: 10,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.30201835632324,
          },
        },
        {
          key: "dr5ru4rgb5",
          doc_count: 10,
          center: {
            location: {
              x: 5.340000152587891,
              y: 3.3,
            },
            count: 10,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 6.280875778198242,
          },
        },
        {
          key: "dr5ru4rg8m",
          doc_count: 10,
          center: {
            location: {
              x: 6.28000020980835,
              y: -0.5,
            },
            count: 10,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 6.299872875213623,
          },
        },
        {
          key: "dr5ru4rfuh",
          doc_count: 10,
          center: {
            location: {
              x: 20.3799991607666,
              y: -15.15,
            },
            count: 10,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 25.394892311096193,
          },
        },
        {
          key: "dr5ru4rezg",
          doc_count: 10,
          center: {
            location: {
              x: 4.400000095367432,
              y: 3.25,
            },
            count: 10,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 5.473844051361084,
          },
        },
        {
          key: "dr5ru4rewu",
          doc_count: 10,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -1,
            },
            count: 10,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 1.1872657537460327,
          },
        },
        {
          key: "dr5ru4rewg",
          doc_count: 10,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -1.5,
            },
            count: 10,
          },
          total_pts: {
            value: 16,
          },
          avg_dist: {
            value: 1.6308280229568481,
          },
        },
        {
          key: "dr5ru4rewd",
          doc_count: 10,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -2,
            },
            count: 10,
          },
          total_pts: {
            value: 16,
          },
          avg_dist: {
            value: 2.0223748683929443,
          },
        },
        {
          key: "dr5ru4rdrn",
          doc_count: 10,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -23.5,
            },
            count: 10,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.553054809570312,
          },
        },
        {
          key: "dr5ru4rus0",
          doc_count: 9,
          center: {
            location: {
              x: 20.3799991607666,
              y: 15.61111111111111,
            },
            count: 9,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 25.672519471910263,
          },
        },
        {
          key: "dr5ru4rgtt",
          doc_count: 9,
          center: {
            location: {
              x: 25.079999923706055,
              y: -0.5,
            },
            count: 9,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.084983825683594,
          },
        },
        {
          key: "dr5ru4rghd",
          doc_count: 9,
          center: {
            location: {
              x: 22.260000228881836,
              y: -11.777777777777779,
            },
            count: 9,
          },
          total_pts: {
            value: 15,
          },
          avg_dist: {
            value: 25.184756596883137,
          },
        },
        {
          key: "dr5ru4rg81",
          doc_count: 9,
          center: {
            location: {
              x: 5.340000152587891,
              y: -2.8333333333333335,
            },
            count: 9,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 6.0487440427144366,
          },
        },
        {
          key: "dr5ru4reyf",
          doc_count: 9,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 2.5,
            },
            count: 9,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 2.580620050430298,
          },
        },
        {
          key: "dr5ru4rex6",
          doc_count: 9,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -2,
            },
            count: 9,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 3.2172038555145264,
          },
        },
        {
          key: "dr5ru4rews",
          doc_count: 9,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -1,
            },
            count: 9,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 1.0440306663513184,
          },
        },
        {
          key: "dr5ru4rewc",
          doc_count: 9,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -2.611111111111111,
            },
            count: 9,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 2.6888171566857233,
          },
        },
        {
          key: "dr5ru4ruk8",
          doc_count: 8,
          center: {
            location: {
              x: 22.260000228881836,
              y: 11,
            },
            count: 8,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 24.829570770263672,
          },
        },
        {
          key: "dr5ru4rsyu",
          doc_count: 8,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 23,
            },
            count: 8,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 23.00890350341797,
          },
        },
        {
          key: "dr5ru4rgjr",
          doc_count: 8,
          center: {
            location: {
              x: 24.139999389648438,
              y: -8.8125,
            },
            count: 8,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.699251174926758,
          },
        },
        {
          key: "dr5ru4rgb0",
          doc_count: 8,
          center: {
            location: {
              x: 5.340000152587891,
              y: 1.5,
            },
            count: 8,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 5.546674728393555,
          },
        },
        {
          key: "dr5ru4rg9r",
          doc_count: 8,
          center: {
            location: {
              x: 10.039999961853027,
              y: 1,
            },
            count: 8,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 10.089677810668945,
          },
        },
        {
          key: "dr5ru4rg8t",
          doc_count: 8,
          center: {
            location: {
              x: 7.21999979019165,
              y: -0.5,
            },
            count: 8,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 7.237292289733887,
          },
        },
        {
          key: "dr5ru4rg8p",
          doc_count: 8,
          center: {
            location: {
              x: 5.340000152587891,
              y: 1,
            },
            count: 8,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 5.432826042175293,
          },
        },
        {
          key: "dr5ru4rg8h",
          doc_count: 8,
          center: {
            location: {
              x: 5.340000152587891,
              y: -1,
            },
            count: 8,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 5.432826042175293,
          },
        },
        {
          key: "dr5ru4rg85",
          doc_count: 8,
          center: {
            location: {
              x: 5.340000152587891,
              y: -1.5,
            },
            count: 8,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 5.546674728393555,
          },
        },
        {
          key: "dr5ru4rg83",
          doc_count: 8,
          center: {
            location: {
              x: 6.28000020980835,
              y: -2.75,
            },
            count: 8,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.85954475402832,
          },
        },
        {
          key: "dr5ru4rfgd",
          doc_count: 8,
          center: {
            location: {
              x: 18.5,
              y: -16.5,
            },
            count: 8,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.78911018371582,
          },
        },
        {
          key: "dr5ru4rfep",
          doc_count: 8,
          center: {
            location: {
              x: 16.6200008392334,
              y: -18.375,
            },
            count: 8,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 24.776729106903076,
          },
        },
        {
          key: "dr5ru4reyc",
          doc_count: 8,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 2,
            },
            count: 8,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 2.099904775619507,
          },
        },
        {
          key: "dr5ru4rexs",
          doc_count: 8,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -1,
            },
            count: 8,
          },
          total_pts: {
            value: 8,
          },
          avg_dist: {
            value: 3.6016106605529785,
          },
        },
        {
          key: "dr5ru4rexf",
          doc_count: 8,
          center: {
            location: {
              x: 4.400000095367432,
              y: -2,
            },
            count: 8,
          },
          total_pts: {
            value: 8,
          },
          avg_dist: {
            value: 4.833218574523926,
          },
        },
        {
          key: "dr5ru4rdw8",
          doc_count: 8,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -22.5,
            },
            count: 8,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 22.50200080871582,
          },
        },
        {
          key: "dr5ru4rukh",
          doc_count: 7,
          center: {
            location: {
              x: 20.3799991607666,
              y: 13.5,
            },
            count: 7,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.445743560791016,
          },
        },
        {
          key: "dr5ru4rsz5",
          doc_count: 7,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 22.357142857142858,
            },
            count: 7,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 22.41290855407715,
          },
        },
        {
          key: "dr5ru4rgt9",
          doc_count: 7,
          center: {
            location: {
              x: 25.079999923706055,
              y: -2.7142857142857144,
            },
            count: 7,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.22764914376395,
          },
        },
        {
          key: "dr5ru4rg9w",
          doc_count: 7,
          center: {
            location: {
              x: 10.979999542236328,
              y: 0.14285714285714285,
            },
            count: 7,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 10.983250754220146,
          },
        },
        {
          key: "dr5ru4rg9j",
          doc_count: 7,
          center: {
            location: {
              x: 9.100000381469727,
              y: -0.5,
            },
            count: 7,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 9.113725662231445,
          },
        },
        {
          key: "dr5ru4rg8k",
          doc_count: 7,
          center: {
            location: {
              x: 6.28000020980835,
              y: -1,
            },
            count: 7,
          },
          total_pts: {
            value: 8,
          },
          avg_dist: {
            value: 6.359119415283203,
          },
        },
        {
          key: "dr5ru4rg6s",
          doc_count: 7,
          center: {
            location: {
              x: 14.739999771118164,
              y: -5.714285714285714,
            },
            count: 7,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 15.810559817722865,
          },
        },
        {
          key: "dr5ru4rfgv",
          doc_count: 7,
          center: {
            location: {
              x: 19.440000534057617,
              y: -14.5,
            },
            count: 7,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.252084732055664,
          },
        },
        {
          key: "dr5ru4rfgs",
          doc_count: 7,
          center: {
            location: {
              x: 18.5,
              y: -15.5,
            },
            count: 7,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.13503646850586,
          },
        },
        {
          key: "dr5ru4rfer",
          doc_count: 7,
          center: {
            location: {
              x: 17.559999465942383,
              y: -18.071428571428573,
            },
            count: 7,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.198112760271346,
          },
        },
        {
          key: "dr5ru4rfd4",
          doc_count: 7,
          center: {
            location: {
              x: 12.859999656677246,
              y: -21.357142857142858,
            },
            count: 7,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.93031910487584,
          },
        },
        {
          key: "dr5ru4rezc",
          doc_count: 7,
          center: {
            location: {
              x: 4.400000095367432,
              y: 2,
            },
            count: 7,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 4.833218574523926,
          },
        },
        {
          key: "dr5ru4reye",
          doc_count: 7,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 3.0714285714285716,
            },
            count: 7,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 3.086087090628488,
          },
        },
        {
          key: "dr5ru4rey9",
          doc_count: 7,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 2,
            },
            count: 7,
          },
          total_pts: {
            value: 14,
          },
          avg_dist: {
            value: 2.0223748683929443,
          },
        },
        {
          key: "dr5ru4rey8",
          doc_count: 7,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 1.5,
            },
            count: 7,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 1.5297058820724487,
          },
        },
        {
          key: "dr5ru4rexe",
          doc_count: 7,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -1.5,
            },
            count: 7,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 3.771153688430786,
          },
        },
        {
          key: "dr5ru4rex2",
          doc_count: 7,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -3.5,
            },
            count: 7,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 4.3128180503845215,
          },
        },
        {
          key: "dr5ru4rety",
          doc_count: 7,
          center: {
            location: {
              x: -2.180000066757202,
              y: 0.14285714285714285,
            },
            count: 7,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 2.1961727482931956,
          },
        },
        {
          key: "dr5ru4rerz",
          doc_count: 7,
          center: {
            location: {
              x: 4.400000095367432,
              y: -4,
            },
            count: 7,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 5.946427345275879,
          },
        },
        {
          key: "dr5ru4rerr",
          doc_count: 7,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -4,
            },
            count: 7,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 4.727621078491211,
          },
        },
        {
          key: "dr5ru4rdqz",
          doc_count: 7,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -23,
            },
            count: 7,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.00890350341797,
          },
        },
        {
          key: "dr5ru4rdqn",
          doc_count: 7,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -23.5,
            },
            count: 7,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.532691955566406,
          },
        },
        {
          key: "dr5ru4ruk7",
          doc_count: 6,
          center: {
            location: {
              x: 21.31999969482422,
              y: 12.666666666666666,
            },
            count: 6,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 24.799753189086914,
          },
        },
        {
          key: "dr5ru4ruhw",
          doc_count: 6,
          center: {
            location: {
              x: 22.260000228881836,
              y: 9.666666666666666,
            },
            count: 6,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.269294102986652,
          },
        },
        {
          key: "dr5ru4rueb",
          doc_count: 6,
          center: {
            location: {
              x: 19.440000534057617,
              y: 15.666666666666666,
            },
            count: 6,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.967810948689777,
          },
        },
        {
          key: "dr5ru4rub7",
          doc_count: 6,
          center: {
            location: {
              x: 6.28000020980835,
              y: 22.25,
            },
            count: 6,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.119375228881836,
          },
        },
        {
          key: "dr5ru4ru7y",
          doc_count: 6,
          center: {
            location: {
              x: 19.440000534057617,
              y: 14.5,
            },
            count: 6,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.252084732055664,
          },
        },
        {
          key: "dr5ru4rsys",
          doc_count: 6,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 23,
            },
            count: 6,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.001956939697266,
          },
        },
        {
          key: "dr5ru4rsyg",
          doc_count: 6,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 22.5,
            },
            count: 6,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 22.50909996032715,
          },
        },
        {
          key: "dr5ru4rgd1",
          doc_count: 6,
          center: {
            location: {
              x: 12.859999656677246,
              y: -2.5833333333333335,
            },
            count: 6,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.118171215057373,
          },
        },
        {
          key: "dr5ru4rgbe",
          doc_count: 6,
          center: {
            location: {
              x: 7.21999979019165,
              y: 3.5,
            },
            count: 6,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 8.023614883422852,
          },
        },
        {
          key: "dr5ru4rg9p",
          doc_count: 6,
          center: {
            location: {
              x: 9.100000381469727,
              y: 1,
            },
            count: 6,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.154780387878418,
          },
        },
        {
          key: "dr5ru4rg8x",
          doc_count: 6,
          center: {
            location: {
              x: 7.21999979019165,
              y: 1,
            },
            count: 6,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 7.288923263549805,
          },
        },
        {
          key: "dr5ru4rg8u",
          doc_count: 6,
          center: {
            location: {
              x: 8.15999984741211,
              y: -1,
            },
            count: 6,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.221046447753906,
          },
        },
        {
          key: "dr5ru4rg8c",
          doc_count: 6,
          center: {
            location: {
              x: 8.15999984741211,
              y: -2.75,
            },
            count: 6,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 8.614187717437744,
          },
        },
        {
          key: "dr5ru4rfup",
          doc_count: 6,
          center: {
            location: {
              x: 20.3799991607666,
              y: -13.5,
            },
            count: 6,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.445743560791016,
          },
        },
        {
          key: "dr5ru4rfgu",
          doc_count: 6,
          center: {
            location: {
              x: 19.440000534057617,
              y: -15.25,
            },
            count: 6,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.70859718322754,
          },
        },
        {
          key: "dr5ru4rfg2",
          doc_count: 6,
          center: {
            location: {
              x: 17.559999465942383,
              y: -17.5,
            },
            count: 6,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.791200637817383,
          },
        },
        {
          key: "dr5ru4rfdy",
          doc_count: 6,
          center: {
            location: {
              x: 15.680000305175781,
              y: -19,
            },
            count: 6,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.63457679748535,
          },
        },
        {
          key: "dr5ru4rfdq",
          doc_count: 6,
          center: {
            location: {
              x: 13.800000190734863,
              y: -19,
            },
            count: 6,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.482759475708008,
          },
        },
        {
          key: "dr5ru4rfd5",
          doc_count: 6,
          center: {
            location: {
              x: 12.859999656677246,
              y: -20.5,
            },
            count: 6,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.199785232543945,
          },
        },
        {
          key: "dr5ru4rez8",
          doc_count: 6,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 1.5,
            },
            count: 6,
          },
          total_pts: {
            value: 8,
          },
          avg_dist: {
            value: 3.771153688430786,
          },
        },
        {
          key: "dr5ru4reyg",
          doc_count: 6,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 3.3333333333333335,
            },
            count: 6,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 3.3945244948069253,
          },
        },
        {
          key: "dr5ru4reyd",
          doc_count: 6,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 2.5,
            },
            count: 6,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 2.5179357528686523,
          },
        },
        {
          key: "dr5ru4rexu",
          doc_count: 6,
          center: {
            location: {
              x: 4.400000095367432,
              y: -1,
            },
            count: 6,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 4.512205600738525,
          },
        },
        {
          key: "dr5ru4rex0",
          doc_count: 6,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -3.5,
            },
            count: 6,
          },
          total_pts: {
            value: 8,
          },
          avg_dist: {
            value: 3.840104103088379,
          },
        },
        {
          key: "dr5ru4rewx",
          doc_count: 6,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 1,
            },
            count: 6,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 1.0440306663513184,
          },
        },
        {
          key: "dr5ru4rewp",
          doc_count: 6,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 1,
            },
            count: 6,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 1.592984676361084,
          },
        },
        {
          key: "dr5ru4rdx0",
          doc_count: 6,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -22.5,
            },
            count: 6,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.55540657043457,
          },
        },
        {
          key: "dr5ru4rdqy",
          doc_count: 6,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -23.5,
            },
            count: 6,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.508712768554688,
          },
        },
        {
          key: "dr5ru4rdqw",
          doc_count: 6,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -23.5,
            },
            count: 6,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.501914978027344,
          },
        },
        {
          key: "dr5ru4rukm",
          doc_count: 5,
          center: {
            location: {
              x: 21.31999969482422,
              y: 14,
            },
            count: 5,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.505733489990234,
          },
        },
        {
          key: "dr5ru4ruke",
          doc_count: 5,
          center: {
            location: {
              x: 22.260000228881836,
              y: 12.7,
            },
            count: 5,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.62894401550293,
          },
        },
        {
          key: "dr5ru4rujn",
          doc_count: 5,
          center: {
            location: {
              x: 23.200000762939453,
              y: 9.7,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.147186279296875,
          },
        },
        {
          key: "dr5ru4rujj",
          doc_count: 5,
          center: {
            location: {
              x: 23.200000762939453,
              y: 9,
            },
            count: 5,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.884532928466797,
          },
        },
        {
          key: "dr5ru4ruj9",
          doc_count: 5,
          center: {
            location: {
              x: 25.079999923706055,
              y: 6.8,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.98657989501953,
          },
        },
        {
          key: "dr5ru4ruj3",
          doc_count: 5,
          center: {
            location: {
              x: 24.139999389648438,
              y: 6.5,
            },
            count: 5,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.999792098999023,
          },
        },
        {
          key: "dr5ru4rue8",
          doc_count: 5,
          center: {
            location: {
              x: 18.5,
              y: 15.6,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.1998592376709,
          },
        },
        {
          key: "dr5ru4rubm",
          doc_count: 5,
          center: {
            location: {
              x: 6.28000020980835,
              y: 23.5,
            },
            count: 5,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.32464599609375,
          },
        },
        {
          key: "dr5ru4rube",
          doc_count: 5,
          center: {
            location: {
              x: 7.21999979019165,
              y: 22.2,
            },
            count: 5,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.344681167602538,
          },
        },
        {
          key: "dr5ru4rszg",
          doc_count: 5,
          center: {
            location: {
              x: 4.400000095367432,
              y: 22.4,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.828085708618165,
          },
        },
        {
          key: "dr5ru4rgv7",
          doc_count: 5,
          center: {
            location: {
              x: 24.139999389648438,
              y: 3.2,
            },
            count: 5,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 24.35238265991211,
          },
        },
        {
          key: "dr5ru4rgtd",
          doc_count: 5,
          center: {
            location: {
              x: 25.079999923706055,
              y: -2,
            },
            count: 5,
          },
          total_pts: {
            value: 12,
          },
          avg_dist: {
            value: 25.159618377685547,
          },
        },
        {
          key: "dr5ru4rgm0",
          doc_count: 5,
          center: {
            location: {
              x: 23.200000762939453,
              y: -8,
            },
            count: 5,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 24.540578842163086,
          },
        },
        {
          key: "dr5ru4rgh6",
          doc_count: 5,
          center: {
            location: {
              x: 21.31999969482422,
              y: -11.7,
            },
            count: 5,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 24.320329666137695,
          },
        },
        {
          key: "dr5ru4rgh2",
          doc_count: 5,
          center: {
            location: {
              x: 21.31999969482422,
              y: -13,
            },
            count: 5,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.9708309173584,
          },
        },
        {
          key: "dr5ru4rgc6",
          doc_count: 5,
          center: {
            location: {
              x: 10.039999961853027,
              y: 2.5,
            },
            count: 5,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.346574783325195,
          },
        },
        {
          key: "dr5ru4rgbg",
          doc_count: 5,
          center: {
            location: {
              x: 8.15999984741211,
              y: 3.4,
            },
            count: 5,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.841952896118164,
          },
        },
        {
          key: "dr5ru4rgbd",
          doc_count: 5,
          center: {
            location: {
              x: 7.21999979019165,
              y: 2.5,
            },
            count: 5,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.640575885772705,
          },
        },
        {
          key: "dr5ru4rgb7",
          doc_count: 5,
          center: {
            location: {
              x: 6.28000020980835,
              y: 3.2,
            },
            count: 5,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.05164794921875,
          },
        },
        {
          key: "dr5ru4rgb4",
          doc_count: 5,
          center: {
            location: {
              x: 5.340000152587891,
              y: 2.5,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 5.896235942840576,
          },
        },
        {
          key: "dr5ru4rgb3",
          doc_count: 5,
          center: {
            location: {
              x: 6.28000020980835,
              y: 2,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 6.590781211853027,
          },
        },
        {
          key: "dr5ru4rgb2",
          doc_count: 5,
          center: {
            location: {
              x: 6.28000020980835,
              y: 1.5,
            },
            count: 5,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 6.456655502319336,
          },
        },
        {
          key: "dr5ru4rg9y",
          doc_count: 5,
          center: {
            location: {
              x: 11.920000076293945,
              y: 0.2,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 11.924192810058594,
          },
        },
        {
          key: "dr5ru4rg9h",
          doc_count: 5,
          center: {
            location: {
              x: 9.100000381469727,
              y: -1,
            },
            count: 5,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.154780387878418,
          },
        },
        {
          key: "dr5ru4rg99",
          doc_count: 5,
          center: {
            location: {
              x: 10.979999542236328,
              y: -2.7,
            },
            count: 5,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 11.309591484069824,
          },
        },
        {
          key: "dr5ru4rg91",
          doc_count: 5,
          center: {
            location: {
              x: 9.100000381469727,
              y: -2.6,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 9.466079139709473,
          },
        },
        {
          key: "dr5ru4rg8z",
          doc_count: 5,
          center: {
            location: {
              x: 8.15999984741211,
              y: 1,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 8.221046447753906,
          },
        },
        {
          key: "dr5ru4rg8g",
          doc_count: 5,
          center: {
            location: {
              x: 8.15999984741211,
              y: -1.5,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 8.296722412109375,
          },
        },
        {
          key: "dr5ru4rg8e",
          doc_count: 5,
          center: {
            location: {
              x: 7.21999979019165,
              y: -1.5,
            },
            count: 5,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.374171257019043,
          },
        },
        {
          key: "dr5ru4rg2k",
          doc_count: 5,
          center: {
            location: {
              x: 6.28000020980835,
              y: -5.7,
            },
            count: 5,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.482985687255859,
          },
        },
        {
          key: "dr5ru4rfuk",
          doc_count: 5,
          center: {
            location: {
              x: 21.31999969482422,
              y: -15.2,
            },
            count: 5,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.18438606262207,
          },
        },
        {
          key: "dr5ru4rfuj",
          doc_count: 5,
          center: {
            location: {
              x: 20.3799991607666,
              y: -14.5,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.011884689331055,
          },
        },
        {
          key: "dr5ru4rfgf",
          doc_count: 5,
          center: {
            location: {
              x: 19.440000534057617,
              y: -16.5,
            },
            count: 5,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.498306274414062,
          },
        },
        {
          key: "dr5ru4rfdx",
          doc_count: 5,
          center: {
            location: {
              x: 14.739999771118164,
              y: -18.2,
            },
            count: 5,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 23.420744705200196,
          },
        },
        {
          key: "dr5ru4rfdv",
          doc_count: 5,
          center: {
            location: {
              x: 15.680000305175781,
              y: -19.5,
            },
            count: 5,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 25.02223777770996,
          },
        },
        {
          key: "dr5ru4rfd6",
          doc_count: 5,
          center: {
            location: {
              x: 13.800000190734863,
              y: -21.1,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.212335205078126,
          },
        },
        {
          key: "dr5ru4rex8",
          doc_count: 5,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -3.5,
            },
            count: 5,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 4.921544551849365,
          },
        },
        {
          key: "dr5ru4rewe",
          doc_count: 5,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -1.5,
            },
            count: 5,
          },
          total_pts: {
            value: 10,
          },
          avg_dist: {
            value: 1.5297058820724487,
          },
        },
        {
          key: "dr5ru4rerw",
          doc_count: 5,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -4.5,
            },
            count: 5,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 5.676407337188721,
          },
        },
        {
          key: "dr5ru4repp",
          doc_count: 5,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -8.8,
            },
            count: 5,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.940821838378906,
          },
        },
        {
          key: "dr5ru4rdxb",
          doc_count: 5,
          center: {
            location: {
              x: 4.400000095367432,
              y: -22.5,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.926185607910156,
          },
        },
        {
          key: "dr5ru4rdx1",
          doc_count: 5,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -22,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.056663513183594,
          },
        },
        {
          key: "dr5ru4rdwb",
          doc_count: 5,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -22.5,
            },
            count: 5,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.50909996032715,
          },
        },
        {
          key: "dr5ru4rdrr",
          doc_count: 5,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -23,
            },
            count: 5,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 23.13763999938965,
          },
        },
        {
          key: "dr5ru4rdqt",
          doc_count: 5,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -24.1,
            },
            count: 5,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.101867294311525,
          },
        },
        {
          key: "dr5ru4ruk5",
          doc_count: 4,
          center: {
            location: {
              x: 20.3799991607666,
              y: 12.625,
            },
            count: 4,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 23.974334716796875,
          },
        },
        {
          key: "dr5ru4ruem",
          doc_count: 4,
          center: {
            location: {
              x: 17.559999465942383,
              y: 18.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.506933212280273,
          },
        },
        {
          key: "dr5ru4rue2",
          doc_count: 4,
          center: {
            location: {
              x: 17.559999465942383,
              y: 15.875,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.67266845703125,
          },
        },
        {
          key: "dr5ru4rudv",
          doc_count: 4,
          center: {
            location: {
              x: 15.680000305175781,
              y: 18.75,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.44280242919922,
          },
        },
        {
          key: "dr5ru4rudt",
          doc_count: 4,
          center: {
            location: {
              x: 14.739999771118164,
              y: 18.875,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.948927879333496,
          },
        },
        {
          key: "dr5ru4rudp",
          doc_count: 4,
          center: {
            location: {
              x: 12.859999656677246,
              y: 20,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.777711868286133,
          },
        },
        {
          key: "dr5ru4ruc9",
          doc_count: 4,
          center: {
            location: {
              x: 10.979999542236328,
              y: 21,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.697265625,
          },
        },
        {
          key: "dr5ru4ruc3",
          doc_count: 4,
          center: {
            location: {
              x: 10.039999961853027,
              y: 21,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.27663230895996,
          },
        },
        {
          key: "dr5ru4ru03",
          doc_count: 4,
          center: {
            location: {
              x: 6.28000020980835,
              y: 6.625,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.129664659500122,
          },
        },
        {
          key: "dr5ru4rszv",
          doc_count: 4,
          center: {
            location: {
              x: 4.400000095367432,
              y: 23.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.908367156982422,
          },
        },
        {
          key: "dr5ru4rszu",
          doc_count: 4,
          center: {
            location: {
              x: 4.400000095367432,
              y: 23,
            },
            count: 4,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 23.41708755493164,
          },
        },
        {
          key: "dr5ru4rszk",
          doc_count: 4,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 23,
            },
            count: 4,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 23.13763999938965,
          },
        },
        {
          key: "dr5ru4rszh",
          doc_count: 4,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 23,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.0542049407959,
          },
        },
        {
          key: "dr5ru4rsze",
          doc_count: 4,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 22.25,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.5174503326416,
          },
        },
        {
          key: "dr5ru4rsyv",
          doc_count: 4,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 23.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.508712768554688,
          },
        },
        {
          key: "dr5ru4rsyt",
          doc_count: 4,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 23.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.501914978027344,
          },
        },
        {
          key: "dr5ru4rsy5",
          doc_count: 4,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 22.25,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.284530639648438,
          },
        },
        {
          key: "dr5ru4rgvv",
          doc_count: 4,
          center: {
            location: {
              x: 26.020000457763672,
              y: 4.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.40625762939453,
          },
        },
        {
          key: "dr5ru4rgtx",
          doc_count: 4,
          center: {
            location: {
              x: 25.079999923706055,
              y: 1,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.09992790222168,
          },
        },
        {
          key: "dr5ru4rgts",
          doc_count: 4,
          center: {
            location: {
              x: 25.079999923706055,
              y: -1,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.09992790222168,
          },
        },
        {
          key: "dr5ru4rgtr",
          doc_count: 4,
          center: {
            location: {
              x: 24.139999389648438,
              y: 1,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.160703659057617,
          },
        },
        {
          key: "dr5ru4rgtb",
          doc_count: 4,
          center: {
            location: {
              x: 26.020000457763672,
              y: -3.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.25434112548828,
          },
        },
        {
          key: "dr5ru4rgm7",
          doc_count: 4,
          center: {
            location: {
              x: 24.139999389648438,
              y: -6.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.999792098999023,
          },
        },
        {
          key: "dr5ru4rgjp",
          doc_count: 4,
          center: {
            location: {
              x: 23.200000762939453,
              y: -8.75,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.796314239501953,
          },
        },
        {
          key: "dr5ru4rgh9",
          doc_count: 4,
          center: {
            location: {
              x: 22.260000228881836,
              y: -12.5,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.529542922973633,
          },
        },
        {
          key: "dr5ru4rgh3",
          doc_count: 4,
          center: {
            location: {
              x: 21.31999969482422,
              y: -12.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.714214324951172,
          },
        },
        {
          key: "dr5ru4rgh0",
          doc_count: 4,
          center: {
            location: {
              x: 20.3799991607666,
              y: -13,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.173215866088867,
          },
        },
        {
          key: "dr5ru4rgfn",
          doc_count: 4,
          center: {
            location: {
              x: 12.859999656677246,
              y: 5,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.797811508178711,
          },
        },
        {
          key: "dr5ru4rgf5",
          doc_count: 4,
          center: {
            location: {
              x: 12.859999656677246,
              y: 3.375,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.29715371131897,
          },
        },
        {
          key: "dr5ru4rgdy",
          doc_count: 4,
          center: {
            location: {
              x: 15.680000305175781,
              y: 0,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.680000305175781,
          },
        },
        {
          key: "dr5ru4rgdq",
          doc_count: 4,
          center: {
            location: {
              x: 13.800000190734863,
              y: 0.375,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.806791543960571,
          },
        },
        {
          key: "dr5ru4rgd3",
          doc_count: 4,
          center: {
            location: {
              x: 13.800000190734863,
              y: -2.75,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.073472023010254,
          },
        },
        {
          key: "dr5ru4rgc7",
          doc_count: 4,
          center: {
            location: {
              x: 10.039999961853027,
              y: 3.375,
            },
            count: 4,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 10.594085693359375,
          },
        },
        {
          key: "dr5ru4rgc4",
          doc_count: 4,
          center: {
            location: {
              x: 9.100000381469727,
              y: 2.5,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.43716049194336,
          },
        },
        {
          key: "dr5ru4rgc1",
          doc_count: 4,
          center: {
            location: {
              x: 9.100000381469727,
              y: 2,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.317188262939453,
          },
        },
        {
          key: "dr5ru4rgbk",
          doc_count: 4,
          center: {
            location: {
              x: 6.28000020980835,
              y: 4,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.445696830749512,
          },
        },
        {
          key: "dr5ru4rgbf",
          doc_count: 4,
          center: {
            location: {
              x: 8.15999984741211,
              y: 2.5,
            },
            count: 4,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 8.534377098083496,
          },
        },
        {
          key: "dr5ru4rg9q",
          doc_count: 4,
          center: {
            location: {
              x: 10.039999961853027,
              y: 0.25,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.046221256256104,
          },
        },
        {
          key: "dr5ru4rg9m",
          doc_count: 4,
          center: {
            location: {
              x: 10.039999961853027,
              y: -0.5,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.05244255065918,
          },
        },
        {
          key: "dr5ru4rg90",
          doc_count: 4,
          center: {
            location: {
              x: 9.100000381469727,
              y: -3.5,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.749872207641602,
          },
        },
        {
          key: "dr5ru4rg2r",
          doc_count: 4,
          center: {
            location: {
              x: 6.28000020980835,
              y: -4,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.445696830749512,
          },
        },
        {
          key: "dr5ru4rfur",
          doc_count: 4,
          center: {
            location: {
              x: 21.31999969482422,
              y: -13.5,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.234745025634766,
          },
        },
        {
          key: "dr5ru4rfun",
          doc_count: 4,
          center: {
            location: {
              x: 20.3799991607666,
              y: -14,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.725379943847656,
          },
        },
        {
          key: "dr5ru4rfgt",
          doc_count: 4,
          center: {
            location: {
              x: 18.5,
              y: -14.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.50531768798828,
          },
        },
        {
          key: "dr5ru4rfgk",
          doc_count: 4,
          center: {
            location: {
              x: 17.559999465942383,
              y: -15.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.42228889465332,
          },
        },
        {
          key: "dr5ru4rfg9",
          doc_count: 4,
          center: {
            location: {
              x: 18.5,
              y: -17,
            },
            count: 4,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 25.12468910217285,
          },
        },
        {
          key: "dr5ru4rfg7",
          doc_count: 4,
          center: {
            location: {
              x: 17.559999465942383,
              y: -16,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.756128311157227,
          },
        },
        {
          key: "dr5ru4rfdm",
          doc_count: 4,
          center: {
            location: {
              x: 13.800000190734863,
              y: -19.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.889118194580078,
          },
        },
        {
          key: "dr5ru4rf9f",
          doc_count: 4,
          center: {
            location: {
              x: 11.920000076293945,
              y: -21.375,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.474236011505127,
          },
        },
        {
          key: "dr5ru4rf90",
          doc_count: 4,
          center: {
            location: {
              x: 9.100000381469727,
              y: -22.5,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.270557403564453,
          },
        },
        {
          key: "dr5ru4rezs",
          doc_count: 4,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 4,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 5.288818359375,
          },
        },
        {
          key: "dr5ru4rezm",
          doc_count: 4,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 4.5,
            },
            count: 4,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 5.157557487487793,
          },
        },
        {
          key: "dr5ru4rezk",
          doc_count: 4,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 4,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 4.727621078491211,
          },
        },
        {
          key: "dr5ru4rezh",
          doc_count: 4,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 4,
            },
            count: 4,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 4.30074405670166,
          },
        },
        {
          key: "dr5ru4rey1",
          doc_count: 4,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 2,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 2.353210687637329,
          },
        },
        {
          key: "dr5ru4rexg",
          doc_count: 4,
          center: {
            location: {
              x: 4.400000095367432,
              y: -1.5,
            },
            count: 4,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 4.648655891418457,
          },
        },
        {
          key: "dr5ru4rewh",
          doc_count: 4,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -1,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 1.592984676361084,
          },
        },
        {
          key: "dr5ru4revf",
          doc_count: 4,
          center: {
            location: {
              x: -2.180000066757202,
              y: 2.5,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 3.316986560821533,
          },
        },
        {
          key: "dr5ru4rerk",
          doc_count: 4,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -5.75,
            },
            count: 4,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 6.278772592544556,
          },
        },
        {
          key: "dr5ru4rerh",
          doc_count: 4,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -5.875,
            },
            count: 4,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 6.0840219259262085,
          },
        },
        {
          key: "dr5ru4rdx2",
          doc_count: 4,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -22.5,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.64068031311035,
          },
        },
        {
          key: "dr5ru4rdw9",
          doc_count: 4,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -22,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.002044677734375,
          },
        },
        {
          key: "dr5ru4rdw0",
          doc_count: 4,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -22.5,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.534143447875977,
          },
        },
        {
          key: "dr5ru4rdrx",
          doc_count: 4,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -23,
            },
            count: 4,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.25879669189453,
          },
        },
        {
          key: "dr5ru4rdqx",
          doc_count: 4,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -23,
            },
            count: 4,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.001956939697266,
          },
        },
        {
          key: "dr5ru4rus2",
          doc_count: 3,
          center: {
            location: {
              x: 21.31999969482422,
              y: 15.833333333333334,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.556973139444988,
          },
        },
        {
          key: "dr5ru4rus1",
          doc_count: 3,
          center: {
            location: {
              x: 20.3799991607666,
              y: 16.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 26.222021102905273,
          },
        },
        {
          key: "dr5ru4rumq",
          doc_count: 3,
          center: {
            location: {
              x: 24.139999389648438,
              y: 14.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 28.160070419311523,
          },
        },
        {
          key: "dr5ru4rum8",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: 11,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.38624382019043,
          },
        },
        {
          key: "dr5ru4rum1",
          doc_count: 3,
          center: {
            location: {
              x: 23.200000762939453,
              y: 11.5,
            },
            count: 3,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 25.893821716308594,
          },
        },
        {
          key: "dr5ru4rukx",
          doc_count: 3,
          center: {
            location: {
              x: 22.260000228881836,
              y: 15,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.84227180480957,
          },
        },
        {
          key: "dr5ru4rukr",
          doc_count: 3,
          center: {
            location: {
              x: 21.31999969482422,
              y: 15,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.06803321838379,
          },
        },
        {
          key: "dr5ru4rukp",
          doc_count: 3,
          center: {
            location: {
              x: 20.3799991607666,
              y: 15,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.30502700805664,
          },
        },
        {
          key: "dr5ru4rukj",
          doc_count: 3,
          center: {
            location: {
              x: 20.3799991607666,
              y: 14,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.725379943847656,
          },
        },
        {
          key: "dr5ru4ruk6",
          doc_count: 3,
          center: {
            location: {
              x: 21.31999969482422,
              y: 12,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.465126037597656,
          },
        },
        {
          key: "dr5ru4ruk3",
          doc_count: 3,
          center: {
            location: {
              x: 21.31999969482422,
              y: 11.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.223798751831055,
          },
        },
        {
          key: "dr5ru4rujp",
          doc_count: 3,
          center: {
            location: {
              x: 23.200000762939453,
              y: 10.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.46546745300293,
          },
        },
        {
          key: "dr5ru4rujh",
          doc_count: 3,
          center: {
            location: {
              x: 23.200000762939453,
              y: 8.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.70809555053711,
          },
        },
        {
          key: "dr5ru4ruj7",
          doc_count: 3,
          center: {
            location: {
              x: 24.139999389648438,
              y: 8,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.431076049804688,
          },
        },
        {
          key: "dr5ru4ruj6",
          doc_count: 3,
          center: {
            location: {
              x: 24.139999389648438,
              y: 7.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.278244018554688,
          },
        },
        {
          key: "dr5ru4ruf5",
          doc_count: 3,
          center: {
            location: {
              x: 12.859999656677246,
              y: 22,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.482927322387695,
          },
        },
        {
          key: "dr5ru4ruf2",
          doc_count: 3,
          center: {
            location: {
              x: 13.800000190734863,
              y: 20.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.712142944335938,
          },
        },
        {
          key: "dr5ru4ruej",
          doc_count: 3,
          center: {
            location: {
              x: 16.6200008392334,
              y: 18.666666666666668,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.993865331013996,
          },
        },
        {
          key: "dr5ru4rueg",
          doc_count: 3,
          center: {
            location: {
              x: 19.440000534057617,
              y: 17.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 26.15652084350586,
          },
        },
        {
          key: "dr5ru4ruee",
          doc_count: 3,
          center: {
            location: {
              x: 18.5,
              y: 17.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.46566390991211,
          },
        },
        {
          key: "dr5ru4ruec",
          doc_count: 3,
          center: {
            location: {
              x: 19.440000534057617,
              y: 16.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.498306274414062,
          },
        },
        {
          key: "dr5ru4rudu",
          doc_count: 3,
          center: {
            location: {
              x: 15.680000305175781,
              y: 18,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.871789932250977,
          },
        },
        {
          key: "dr5ru4rudr",
          doc_count: 3,
          center: {
            location: {
              x: 13.800000190734863,
              y: 20,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.29897117614746,
          },
        },
        {
          key: "dr5ru4rucf",
          doc_count: 3,
          center: {
            location: {
              x: 11.920000076293945,
              y: 21.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.583253860473633,
          },
        },
        {
          key: "dr5ru4rucd",
          doc_count: 3,
          center: {
            location: {
              x: 10.979999542236328,
              y: 21.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.14146614074707,
          },
        },
        {
          key: "dr5ru4ruc5",
          doc_count: 3,
          center: {
            location: {
              x: 9.100000381469727,
              y: 22.333333333333332,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.116295496622723,
          },
        },
        {
          key: "dr5ru4rubg",
          doc_count: 3,
          center: {
            location: {
              x: 8.15999984741211,
              y: 22.333333333333332,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.777510325113933,
          },
        },
        {
          key: "dr5ru4ru46",
          doc_count: 3,
          center: {
            location: {
              x: 13.800000190734863,
              y: 7.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.706368446350098,
          },
        },
        {
          key: "dr5ru4rszt",
          doc_count: 3,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 23.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.75334930419922,
          },
        },
        {
          key: "dr5ru4rszm",
          doc_count: 3,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 23.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.634729385375977,
          },
        },
        {
          key: "dr5ru4rszj",
          doc_count: 3,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 23.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.553054809570312,
          },
        },
        {
          key: "dr5ru4rsyh",
          doc_count: 3,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 23,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.033401489257812,
          },
        },
        {
          key: "dr5ru4rsvg",
          doc_count: 3,
          center: {
            location: {
              x: -2.180000066757202,
              y: 22.166666666666668,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.27361806233724,
          },
        },
        {
          key: "dr5ru4rsr6",
          doc_count: 3,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 12,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.26174545288086,
          },
        },
        {
          key: "dr5ru4rgwn",
          doc_count: 3,
          center: {
            location: {
              x: 26.959999084472656,
              y: 0,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.959999084472656,
          },
        },
        {
          key: "dr5ru4rgwh",
          doc_count: 3,
          center: {
            location: {
              x: 26.959999084472656,
              y: -1,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.978540420532227,
          },
        },
        {
          key: "dr5ru4rgvw",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: 5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.573549270629883,
          },
        },
        {
          key: "dr5ru4rgvt",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: 4.5,
            },
            count: 3,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 25.480510711669922,
          },
        },
        {
          key: "dr5ru4rgvs",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: 4,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.396976470947266,
          },
        },
        {
          key: "dr5ru4rgve",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: 3.3333333333333335,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.30162302652995,
          },
        },
        {
          key: "dr5ru4rgvd",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: 2.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.204294204711914,
          },
        },
        {
          key: "dr5ru4rgv6",
          doc_count: 3,
          center: {
            location: {
              x: 24.139999389648438,
              y: 2.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.269107818603516,
          },
        },
        {
          key: "dr5ru4rgtz",
          doc_count: 3,
          center: {
            location: {
              x: 26.020000457763672,
              y: 1,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.039209365844727,
          },
        },
        {
          key: "dr5ru4rgtw",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: 0,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.079999923706055,
          },
        },
        {
          key: "dr5ru4rgtv",
          doc_count: 3,
          center: {
            location: {
              x: 26.020000457763672,
              y: -0.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 26.024803161621094,
          },
        },
        {
          key: "dr5ru4rgtu",
          doc_count: 3,
          center: {
            location: {
              x: 26.020000457763672,
              y: -1,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.039209365844727,
          },
        },
        {
          key: "dr5ru4rgtq",
          doc_count: 3,
          center: {
            location: {
              x: 24.139999389648438,
              y: 0.16666666666666666,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.141725540161133,
          },
        },
        {
          key: "dr5ru4rgte",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: -1.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.12481689453125,
          },
        },
        {
          key: "dr5ru4rgqh",
          doc_count: 3,
          center: {
            location: {
              x: 26.959999084472656,
              y: -5.666666666666667,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.550060272216797,
          },
        },
        {
          key: "dr5ru4rgmt",
          doc_count: 3,
          center: {
            location: {
              x: 25.079999923706055,
              y: -5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.573549270629883,
          },
        },
        {
          key: "dr5ru4rgmg",
          doc_count: 3,
          center: {
            location: {
              x: 26.020000457763672,
              y: -6.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 26.819589614868164,
          },
        },
        {
          key: "dr5ru4rgm5",
          doc_count: 3,
          center: {
            location: {
              x: 23.200000762939453,
              y: -6.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.093360900878906,
          },
        },
        {
          key: "dr5ru4rgjj",
          doc_count: 3,
          center: {
            location: {
              x: 23.200000762939453,
              y: -10,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.263412475585938,
          },
        },
        {
          key: "dr5ru4rghs",
          doc_count: 3,
          center: {
            location: {
              x: 22.260000228881836,
              y: -10.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.61214256286621,
          },
        },
        {
          key: "dr5ru4rghe",
          doc_count: 3,
          center: {
            location: {
              x: 22.260000228881836,
              y: -11,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.829570770263672,
          },
        },
        {
          key: "dr5ru4rgfg",
          doc_count: 3,
          center: {
            location: {
              x: 15.680000305175781,
              y: 3,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.964410781860352,
          },
        },
        {
          key: "dr5ru4rgeq",
          doc_count: 3,
          center: {
            location: {
              x: 17.559999465942383,
              y: 0,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.559999465942383,
          },
        },
        {
          key: "dr5ru4rge6",
          doc_count: 3,
          center: {
            location: {
              x: 17.559999465942383,
              y: -2,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.67352867126465,
          },
        },
        {
          key: "dr5ru4rgdv",
          doc_count: 3,
          center: {
            location: {
              x: 15.680000305175781,
              y: -0.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.687970161437988,
          },
        },
        {
          key: "dr5ru4rgdh",
          doc_count: 3,
          center: {
            location: {
              x: 12.859999656677246,
              y: -1,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.898821830749512,
          },
        },
        {
          key: "dr5ru4rgdc",
          doc_count: 3,
          center: {
            location: {
              x: 15.680000305175781,
              y: -2.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.878047943115234,
          },
        },
        {
          key: "dr5ru4rgd4",
          doc_count: 3,
          center: {
            location: {
              x: 12.859999656677246,
              y: -2,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.014592170715332,
          },
        },
        {
          key: "dr5ru4rgd2",
          doc_count: 3,
          center: {
            location: {
              x: 13.800000190734863,
              y: -3.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.236924171447754,
          },
        },
        {
          key: "dr5ru4rgd0",
          doc_count: 3,
          center: {
            location: {
              x: 12.859999656677246,
              y: -3.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.327775955200195,
          },
        },
        {
          key: "dr5ru4rgcg",
          doc_count: 3,
          center: {
            location: {
              x: 11.920000076293945,
              y: 3.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.42322063446045,
          },
        },
        {
          key: "dr5ru4rgcd",
          doc_count: 3,
          center: {
            location: {
              x: 10.979999542236328,
              y: 2.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.261012077331543,
          },
        },
        {
          key: "dr5ru4rgc5",
          doc_count: 3,
          center: {
            location: {
              x: 9.100000381469727,
              y: 3.1666666666666665,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 9.63779322306315,
          },
        },
        {
          key: "dr5ru4rgbs",
          doc_count: 3,
          center: {
            location: {
              x: 7.21999979019165,
              y: 4,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.253993034362793,
          },
        },
        {
          key: "dr5ru4rgbc",
          doc_count: 3,
          center: {
            location: {
              x: 8.15999984741211,
              y: 2,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.40152359008789,
          },
        },
        {
          key: "dr5ru4rgb6",
          doc_count: 3,
          center: {
            location: {
              x: 6.28000020980835,
              y: 2.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.759319305419922,
          },
        },
        {
          key: "dr5ru4rg9x",
          doc_count: 3,
          center: {
            location: {
              x: 10.979999542236328,
              y: 1,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.025443077087402,
          },
        },
        {
          key: "dr5ru4rg9s",
          doc_count: 3,
          center: {
            location: {
              x: 10.979999542236328,
              y: -1,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.025443077087402,
          },
        },
        {
          key: "dr5ru4rg9k",
          doc_count: 3,
          center: {
            location: {
              x: 10.039999961853027,
              y: -1,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 10.089677810668945,
          },
        },
        {
          key: "dr5ru4rg9c",
          doc_count: 3,
          center: {
            location: {
              x: 11.920000076293945,
              y: -2.6666666666666665,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 12.216802279154459,
          },
        },
        {
          key: "dr5ru4rg9b",
          doc_count: 3,
          center: {
            location: {
              x: 11.920000076293945,
              y: -3.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.42322063446045,
          },
        },
        {
          key: "dr5ru4rg94",
          doc_count: 3,
          center: {
            location: {
              x: 9.100000381469727,
              y: -2,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.317188262939453,
          },
        },
        {
          key: "dr5ru4rg8s",
          doc_count: 3,
          center: {
            location: {
              x: 7.21999979019165,
              y: -1,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 7.288923263549805,
          },
        },
        {
          key: "dr5ru4rg8b",
          doc_count: 3,
          center: {
            location: {
              x: 8.15999984741211,
              y: -3.5,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 8.878941535949707,
          },
        },
        {
          key: "dr5ru4rg89",
          doc_count: 3,
          center: {
            location: {
              x: 7.21999979019165,
              y: -2.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.640575885772705,
          },
        },
        {
          key: "dr5ru4rg86",
          doc_count: 3,
          center: {
            location: {
              x: 6.28000020980835,
              y: -2,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 6.590781211853027,
          },
        },
        {
          key: "dr5ru4rg6u",
          doc_count: 3,
          center: {
            location: {
              x: 15.680000305175781,
              y: -5.666666666666667,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 16.67400614420573,
          },
        },
        {
          key: "dr5ru4rg6k",
          doc_count: 3,
          center: {
            location: {
              x: 13.800000190734863,
              y: -5.833333333333333,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.98382822672526,
          },
        },
        {
          key: "dr5ru4rg6f",
          doc_count: 3,
          center: {
            location: {
              x: 15.680000305175781,
              y: -7,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.171558380126953,
          },
        },
        {
          key: "dr5ru4rg67",
          doc_count: 3,
          center: {
            location: {
              x: 13.800000190734863,
              y: -6.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.254179954528809,
          },
        },
        {
          key: "dr5ru4rg45",
          doc_count: 3,
          center: {
            location: {
              x: 12.859999656677246,
              y: -11,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.922754287719727,
          },
        },
        {
          key: "dr5ru4rg3h",
          doc_count: 3,
          center: {
            location: {
              x: 9.100000381469727,
              y: -5.5,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 10.632967948913574,
          },
        },
        {
          key: "dr5ru4rg31",
          doc_count: 3,
          center: {
            location: {
              x: 9.100000381469727,
              y: -7.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 11.792370796203613,
          },
        },
        {
          key: "dr5ru4rg2w",
          doc_count: 3,
          center: {
            location: {
              x: 7.21999979019165,
              y: -4.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.507549285888672,
          },
        },
        {
          key: "dr5ru4rg2n",
          doc_count: 3,
          center: {
            location: {
              x: 5.340000152587891,
              y: -4.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 6.983237266540527,
          },
        },
        {
          key: "dr5ru4rg1t",
          doc_count: 3,
          center: {
            location: {
              x: 10.979999542236328,
              y: -10,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.851276397705078,
          },
        },
        {
          key: "dr5ru4rg0p",
          doc_count: 3,
          center: {
            location: {
              x: 5.340000152587891,
              y: -8.833333333333334,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.322716077168783,
          },
        },
        {
          key: "dr5ru4rfux",
          doc_count: 3,
          center: {
            location: {
              x: 22.260000228881836,
              y: -13.5,
            },
            count: 3,
          },
          total_pts: {
            value: 9,
          },
          avg_dist: {
            value: 26.033777236938477,
          },
        },
        {
          key: "dr5ru4rfu1",
          doc_count: 3,
          center: {
            location: {
              x: 20.3799991607666,
              y: -17,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.539487838745117,
          },
        },
        {
          key: "dr5ru4rfu0",
          doc_count: 3,
          center: {
            location: {
              x: 20.3799991607666,
              y: -17.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.86250877380371,
          },
        },
        {
          key: "dr5ru4rfg6",
          doc_count: 3,
          center: {
            location: {
              x: 17.559999465942383,
              y: -16.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.095718383789062,
          },
        },
        {
          key: "dr5ru4rfg4",
          doc_count: 3,
          center: {
            location: {
              x: 16.6200008392334,
              y: -16.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.419530868530273,
          },
        },
        {
          key: "dr5ru4rfg3",
          doc_count: 3,
          center: {
            location: {
              x: 17.559999465942383,
              y: -17,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.440818786621094,
          },
        },
        {
          key: "dr5ru4rfg0",
          doc_count: 3,
          center: {
            location: {
              x: 16.6200008392334,
              y: -17.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.134506225585938,
          },
        },
        {
          key: "dr5ru4rfex",
          doc_count: 3,
          center: {
            location: {
              x: 18.5,
              y: -18.166666666666668,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.928862889607746,
          },
        },
        {
          key: "dr5ru4rfdk",
          doc_count: 3,
          center: {
            location: {
              x: 13.800000190734863,
              y: -20,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.29897117614746,
          },
        },
        {
          key: "dr5ru4rf91",
          doc_count: 3,
          center: {
            location: {
              x: 9.100000381469727,
              y: -22,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.807771682739258,
          },
        },
        {
          key: "dr5ru4rf8f",
          doc_count: 3,
          center: {
            location: {
              x: 8.15999984741211,
              y: -21.333333333333332,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.840837478637695,
          },
        },
        {
          key: "dr5ru4rf8c",
          doc_count: 3,
          center: {
            location: {
              x: 8.15999984741211,
              y: -22,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.464561462402344,
          },
        },
        {
          key: "dr5ru4rf82",
          doc_count: 3,
          center: {
            location: {
              x: 6.28000020980835,
              y: -22.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.359973907470703,
          },
        },
        {
          key: "dr5ru4rezw",
          doc_count: 3,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.080427646636963,
          },
        },
        {
          key: "dr5ru4rezv",
          doc_count: 3,
          center: {
            location: {
              x: 4.400000095367432,
              y: 4.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.293647766113281,
          },
        },
        {
          key: "dr5ru4rezt",
          doc_count: 3,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 4.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 5.676407337188721,
          },
        },
        {
          key: "dr5ru4rezq",
          doc_count: 3,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 5.599143028259277,
          },
        },
        {
          key: "dr5ru4rezp",
          doc_count: 3,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 5.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 5.722446918487549,
          },
        },
        {
          key: "dr5ru4rezj",
          doc_count: 3,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 4.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 4.769318580627441,
          },
        },
        {
          key: "dr5ru4reyv",
          doc_count: 3,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 4.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 4.545283317565918,
          },
        },
        {
          key: "dr5ru4rey5",
          doc_count: 3,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 3.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 3.713165760040283,
          },
        },
        {
          key: "dr5ru4rey4",
          doc_count: 3,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 2.5,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 2.7906272411346436,
          },
        },
        {
          key: "dr5ru4rewj",
          doc_count: 3,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -0.5,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 1.3370115756988525,
          },
        },
        {
          key: "dr5ru4rew5",
          doc_count: 3,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -1.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 1.9461756944656372,
          },
        },
        {
          key: "dr5ru4revc",
          doc_count: 3,
          center: {
            location: {
              x: -2.180000066757202,
              y: 2,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 2.9584455490112305,
          },
        },
        {
          key: "dr5ru4reru",
          doc_count: 3,
          center: {
            location: {
              x: 4.400000095367432,
              y: -5.666666666666667,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 7.175767739613851,
          },
        },
        {
          key: "dr5ru4rert",
          doc_count: 3,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.080427646636963,
          },
        },
        {
          key: "dr5ru4rerp",
          doc_count: 3,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -4,
            },
            count: 3,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 4.30074405670166,
          },
        },
        {
          key: "dr5ru4rerj",
          doc_count: 3,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -5,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 5.243700981140137,
          },
        },
        {
          key: "dr5ru4reqy",
          doc_count: 3,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -4.5,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 4.545283317565918,
          },
        },
        {
          key: "dr5ru4requ",
          doc_count: 3,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -5.666666666666667,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 5.702753067016602,
          },
        },
        {
          key: "dr5ru4rdzm",
          doc_count: 3,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -14.5,
            },
            count: 3,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 14.717350006103516,
          },
        },
        {
          key: "dr5ru4rdx8",
          doc_count: 3,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -22.5,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.764480590820312,
          },
        },
        {
          key: "dr5ru4rdwc",
          doc_count: 3,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -22,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.009307861328125,
          },
        },
        {
          key: "dr5ru4rdw1",
          doc_count: 3,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -22,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.0349178314209,
          },
        },
        {
          key: "dr5ru4rdrw",
          doc_count: 3,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -23.5,
            },
            count: 3,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 23.75334930419922,
          },
        },
        {
          key: "dr5ru4rdrp",
          doc_count: 3,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -23,
            },
            count: 3,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.0542049407959,
          },
        },
        {
          key: "dr5ru4rdmy",
          doc_count: 3,
          center: {
            location: {
              x: -2.180000066757202,
              y: -23.5,
            },
            count: 3,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.60089874267578,
          },
        },
        {
          key: "dr5ru4rut3",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: 16.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.240205764770508,
          },
        },
        {
          key: "dr5ru4rush",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: 18,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.190887451171875,
          },
        },
        {
          key: "dr5ru4rus5",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: 17.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.86250877380371,
          },
        },
        {
          key: "dr5ru4rum6",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: 12,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.95810890197754,
          },
        },
        {
          key: "dr5ru4rukt",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: 14,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.296531677246094,
          },
        },
        {
          key: "dr5ru4ruks",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: 13.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.033777236938477,
          },
        },
        {
          key: "dr5ru4rukq",
          doc_count: 2,
          center: {
            location: {
              x: 21.31999969482422,
              y: 14.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.7835693359375,
          },
        },
        {
          key: "dr5ru4rukn",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: 14.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.011884689331055,
          },
        },
        {
          key: "dr5ru4rukk",
          doc_count: 2,
          center: {
            location: {
              x: 21.31999969482422,
              y: 13.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.234745025634766,
          },
        },
        {
          key: "dr5ru4rukd",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: 12,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.288488388061523,
          },
        },
        {
          key: "dr5ru4ruk9",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: 11.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.055091857910156,
          },
        },
        {
          key: "dr5ru4ruk4",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: 12,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.650463104248047,
          },
        },
        {
          key: "dr5ru4rujv",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: 9,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.532533645629883,
          },
        },
        {
          key: "dr5ru4rujq",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: 9.75,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.035664558410645,
          },
        },
        {
          key: "dr5ru4rujm",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: 9,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.76314353942871,
          },
        },
        {
          key: "dr5ru4rujk",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: 8.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.592763900756836,
          },
        },
        {
          key: "dr5ru4rujd",
          doc_count: 2,
          center: {
            location: {
              x: 25.079999923706055,
              y: 7.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.17740249633789,
          },
        },
        {
          key: "dr5ru4rujc",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: 7,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.94513702392578,
          },
        },
        {
          key: "dr5ru4ruj8",
          doc_count: 2,
          center: {
            location: {
              x: 25.079999923706055,
              y: 6,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.787717819213867,
          },
        },
        {
          key: "dr5ru4ruj1",
          doc_count: 2,
          center: {
            location: {
              x: 23.200000762939453,
              y: 6.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.093360900878906,
          },
        },
        {
          key: "dr5ru4ruht",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: 9,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.01057243347168,
          },
        },
        {
          key: "dr5ru4ruhs",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: 8.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.827665328979492,
          },
        },
        {
          key: "dr5ru4ruhr",
          doc_count: 2,
          center: {
            location: {
              x: 21.31999969482422,
              y: 10.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.765361785888672,
          },
        },
        {
          key: "dr5ru4ruf9",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: 21,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.656726837158203,
          },
        },
        {
          key: "dr5ru4ruf3",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: 21,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.128469467163086,
          },
        },
        {
          key: "dr5ru4rueu",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: 18,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.49365234375,
          },
        },
        {
          key: "dr5ru4rues",
          doc_count: 2,
          center: {
            location: {
              x: 18.5,
              y: 18,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.811819076538086,
          },
        },
        {
          key: "dr5ru4rueh",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: 18,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.49947738647461,
          },
        },
        {
          key: "dr5ru4ruef",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: 17,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.824670791625977,
          },
        },
        {
          key: "dr5ru4rue5",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: 17.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.134506225585938,
          },
        },
        {
          key: "dr5ru4rue3",
          doc_count: 2,
          center: {
            location: {
              x: 17.559999465942383,
              y: 16.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.095718383789062,
          },
        },
        {
          key: "dr5ru4rue0",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: 16,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.069988250732422,
          },
        },
        {
          key: "dr5ru4rudy",
          doc_count: 2,
          center: {
            location: {
              x: 15.680000305175781,
              y: 19.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.02223777770996,
          },
        },
        {
          key: "dr5ru4rudx",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: 20,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.844871520996094,
          },
        },
        {
          key: "dr5ru4rudq",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: 19.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.889118194580078,
          },
        },
        {
          key: "dr5ru4rudm",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: 19,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.482759475708008,
          },
        },
        {
          key: "dr5ru4rucc",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: 21,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.14718246459961,
          },
        },
        {
          key: "dr5ru4ruc7",
          doc_count: 2,
          center: {
            location: {
              x: 10.039999961853027,
              y: 22,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.18267059326172,
          },
        },
        {
          key: "dr5ru4ruc4",
          doc_count: 2,
          center: {
            location: {
              x: 9.100000381469727,
              y: 21.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.346519470214844,
          },
        },
        {
          key: "dr5ru4ruc1",
          doc_count: 2,
          center: {
            location: {
              x: 9.100000381469727,
              y: 21,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.88689613342285,
          },
        },
        {
          key: "dr5ru4rubv",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: 23.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.876405715942383,
          },
        },
        {
          key: "dr5ru4rubt",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: 23.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.584108352661133,
          },
        },
        {
          key: "dr5ru4rubj",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: 23.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.099079132080078,
          },
        },
        {
          key: "dr5ru4rubh",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: 23,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.61176872253418,
          },
        },
        {
          key: "dr5ru4rubf",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: 21.5,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 22.99642562866211,
          },
        },
        {
          key: "dr5ru4rub5",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: 22.25,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.881903648376465,
          },
        },
        {
          key: "dr5ru4ru7z",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: 15,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.554298400878906,
          },
        },
        {
          key: "dr5ru4ru7v",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: 14,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.956493377685547,
          },
        },
        {
          key: "dr5ru4ru6s",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: 13.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.98793601989746,
          },
        },
        {
          key: "dr5ru4ru67",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: 12.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.619613647460938,
          },
        },
        {
          key: "dr5ru4ru5n",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: 9.75,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.270012855529785,
          },
        },
        {
          key: "dr5ru4ru5k",
          doc_count: 2,
          center: {
            location: {
              x: 17.559999465942383,
              y: 8.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.509063720703125,
          },
        },
        {
          key: "dr5ru4ru54",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: 7.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.2338809967041,
          },
        },
        {
          key: "dr5ru4ru4x",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: 10.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.09744644165039,
          },
        },
        {
          key: "dr5ru4ru4q",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: 9.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.89805316925049,
          },
        },
        {
          key: "dr5ru4ru4p",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: 10.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.602096557617188,
          },
        },
        {
          key: "dr5ru4ru4n",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: 9.75,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.139448165893555,
          },
        },
        {
          key: "dr5ru4ru4m",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: 9,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.47543716430664,
          },
        },
        {
          key: "dr5ru4ru4j",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: 9,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.696483612060547,
          },
        },
        {
          key: "dr5ru4ru4e",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: 8,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.771034240722656,
          },
        },
        {
          key: "dr5ru4ru3g",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: 12.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.455029487609863,
          },
        },
        {
          key: "dr5ru4ru3f",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: 12,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.91408920288086,
          },
        },
        {
          key: "dr5ru4ru3b",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: 11,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.219938278198242,
          },
        },
        {
          key: "dr5ru4ru35",
          doc_count: 2,
          center: {
            location: {
              x: 9.100000381469727,
              y: 12.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.665043830871582,
          },
        },
        {
          key: "dr5ru4ru2k",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: 13.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.889204025268555,
          },
        },
        {
          key: "dr5ru4ru2h",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: 13.5,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 14.517768859863281,
          },
        },
        {
          key: "dr5ru4ru2c",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: 11.5,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 14.100907325744629,
          },
        },
        {
          key: "dr5ru4ru20",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: 11,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.227657318115234,
          },
        },
        {
          key: "dr5ru4ru1n",
          doc_count: 2,
          center: {
            location: {
              x: 9.100000381469727,
              y: 9.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.155226707458496,
          },
        },
        {
          key: "dr5ru4ru0z",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: 10.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.297954559326172,
          },
        },
        {
          key: "dr5ru4ru0y",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: 9.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.715103149414062,
          },
        },
        {
          key: "dr5ru4ru0m",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: 9,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.974443435668945,
          },
        },
        {
          key: "dr5ru4ru06",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: 7.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.782044410705566,
          },
        },
        {
          key: "dr5ru4rszy",
          doc_count: 2,
          center: {
            location: {
              x: 4.400000095367432,
              y: 24,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.399999618530273,
          },
        },
        {
          key: "dr5ru4rszn",
          doc_count: 2,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 24,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.051952362060547,
          },
        },
        {
          key: "dr5ru4rsyw",
          doc_count: 2,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 24,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.001874923706055,
          },
        },
        {
          key: "dr5ru4rsyj",
          doc_count: 2,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 23.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.532691955566406,
          },
        },
        {
          key: "dr5ru4rswg",
          doc_count: 2,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 17.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.511699676513672,
          },
        },
        {
          key: "dr5ru4rsvt",
          doc_count: 2,
          center: {
            location: {
              x: -3.119999885559082,
              y: 23.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.70621109008789,
          },
        },
        {
          key: "dr5ru4rsve",
          doc_count: 2,
          center: {
            location: {
              x: -3.119999885559082,
              y: 22.25,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.46771240234375,
          },
        },
        {
          key: "dr5ru4rsrq",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 14.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.717350006103516,
          },
        },
        {
          key: "dr5ru4rsrg",
          doc_count: 2,
          center: {
            location: {
              x: 4.400000095367432,
              y: 13,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.724431037902832,
          },
        },
        {
          key: "dr5ru4rsrf",
          doc_count: 2,
          center: {
            location: {
              x: 4.400000095367432,
              y: 12,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.78123664855957,
          },
        },
        {
          key: "dr5ru4rsr5",
          doc_count: 2,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 12.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.59946060180664,
          },
        },
        {
          key: "dr5ru4rsqe",
          doc_count: 2,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 12.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.503599166870117,
          },
        },
        {
          key: "dr5ru4rsqc",
          doc_count: 2,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 11.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.517794609069824,
          },
        },
        {
          key: "dr5ru4rsq4",
          doc_count: 2,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 12,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.063896179199219,
          },
        },
        {
          key: "dr5ru4rspq",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 9.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.070591449737549,
          },
        },
        {
          key: "dr5ru4rspn",
          doc_count: 2,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 10,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.12405014038086,
          },
        },
        {
          key: "dr5ru4rsp3",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 6.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.971398830413818,
          },
        },
        {
          key: "dr5ru4rsp2",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 6,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.507718563079834,
          },
        },
        {
          key: "dr5ru4rsnw",
          doc_count: 2,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 10,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.004499435424805,
          },
        },
        {
          key: "dr5ru4rsnu",
          doc_count: 2,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 8.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.524060249328613,
          },
        },
        {
          key: "dr5ru4rsnc",
          doc_count: 2,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 7,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.029196262359619,
          },
        },
        {
          key: "dr5ru4rgyg",
          doc_count: 2,
          center: {
            location: {
              x: 29.780000686645508,
              y: 3.25,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.95784854888916,
          },
        },
        {
          key: "dr5ru4rgy7",
          doc_count: 2,
          center: {
            location: {
              x: 27.899999618530273,
              y: 3.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 28.118677139282227,
          },
        },
        {
          key: "dr5ru4rgy4",
          doc_count: 2,
          center: {
            location: {
              x: 26.959999084472656,
              y: 2.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.075664520263672,
          },
        },
        {
          key: "dr5ru4rgwq",
          doc_count: 2,
          center: {
            location: {
              x: 27.899999618530273,
              y: 0.25,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.90223979949951,
          },
        },
        {
          key: "dr5ru4rgwp",
          doc_count: 2,
          center: {
            location: {
              x: 26.959999084472656,
              y: 1,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.978540420532227,
          },
        },
        {
          key: "dr5ru4rgw2",
          doc_count: 2,
          center: {
            location: {
              x: 27.899999618530273,
              y: -3.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.118677139282227,
          },
        },
        {
          key: "dr5ru4rgw1",
          doc_count: 2,
          center: {
            location: {
              x: 26.959999084472656,
              y: -2.75,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.101032257080078,
          },
        },
        {
          key: "dr5ru4rgvz",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: 5.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.594932556152344,
          },
        },
        {
          key: "dr5ru4rgvy",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: 5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.496044158935547,
          },
        },
        {
          key: "dr5ru4rgvx",
          doc_count: 2,
          center: {
            location: {
              x: 25.079999923706055,
              y: 5.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.675989151000977,
          },
        },
        {
          key: "dr5ru4rgvq",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: 5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.652374267578125,
          },
        },
        {
          key: "dr5ru4rgvg",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: 3.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.25434112548828,
          },
        },
        {
          key: "dr5ru4rgvf",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: 2.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.13982391357422,
          },
        },
        {
          key: "dr5ru4rgvb",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: 1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.063199996948242,
          },
        },
        {
          key: "dr5ru4rgv8",
          doc_count: 2,
          center: {
            location: {
              x: 25.079999923706055,
              y: 1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.12481689453125,
          },
        },
        {
          key: "dr5ru4rgty",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: 0.25,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.022401809692383,
          },
        },
        {
          key: "dr5ru4rgtn",
          doc_count: 2,
          center: {
            location: {
              x: 23.200000762939453,
              y: 0,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.200000762939453,
          },
        },
        {
          key: "dr5ru4rgtg",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: -1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.063199996948242,
          },
        },
        {
          key: "dr5ru4rgtf",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: -2,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.096750259399414,
          },
        },
        {
          key: "dr5ru4rgtc",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: -2.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.13982391357422,
          },
        },
        {
          key: "dr5ru4rgs4",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: -2,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.4778995513916,
          },
        },
        {
          key: "dr5ru4rgmr",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: -4,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.46915626525879,
          },
        },
        {
          key: "dr5ru4rgmq",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: -4.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.55584716796875,
          },
        },
        {
          key: "dr5ru4rgmk",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: -5.5,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.75862693786621,
          },
        },
        {
          key: "dr5ru4rgmc",
          doc_count: 2,
          center: {
            location: {
              x: 26.020000457763672,
              y: -7.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.079336166381836,
          },
        },
        {
          key: "dr5ru4rgk8",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: -8,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.653913497924805,
          },
        },
        {
          key: "dr5ru4rgjx",
          doc_count: 2,
          center: {
            location: {
              x: 25.079999923706055,
              y: -9,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.645944595336914,
          },
        },
        {
          key: "dr5ru4rgjm",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: -10,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.12928581237793,
          },
        },
        {
          key: "dr5ru4rgjk",
          doc_count: 2,
          center: {
            location: {
              x: 24.139999389648438,
              y: -10.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.324695587158203,
          },
        },
        {
          key: "dr5ru4rgj4",
          doc_count: 2,
          center: {
            location: {
              x: 23.200000762939453,
              y: -11.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.893821716308594,
          },
        },
        {
          key: "dr5ru4rgj1",
          doc_count: 2,
          center: {
            location: {
              x: 23.200000762939453,
              y: -12.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.353178024291992,
          },
        },
        {
          key: "dr5ru4rghk",
          doc_count: 2,
          center: {
            location: {
              x: 21.31999969482422,
              y: -10.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.765361785888672,
          },
        },
        {
          key: "dr5ru4rgh8",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: -13,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.778045654296875,
          },
        },
        {
          key: "dr5ru4rgh5",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: -11,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.15911102294922,
          },
        },
        {
          key: "dr5ru4rgh4",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: -12,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.650463104248047,
          },
        },
        {
          key: "dr5ru4rggm",
          doc_count: 2,
          center: {
            location: {
              x: 17.559999465942383,
              y: 4.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.127426147460938,
          },
        },
        {
          key: "dr5ru4rgfx",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: 5.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.732691764831543,
          },
        },
        {
          key: "dr5ru4rgfj",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: 4.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.624595642089844,
          },
        },
        {
          key: "dr5ru4rgfh",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: 4,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.467724800109863,
          },
        },
        {
          key: "dr5ru4rgf7",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: 3.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.236924171447754,
          },
        },
        {
          key: "dr5ru4rgf0",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: 1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.947184562683105,
          },
        },
        {
          key: "dr5ru4rgez",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: 1,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.4657039642334,
          },
        },
        {
          key: "dr5ru4rger",
          doc_count: 2,
          center: {
            location: {
              x: 17.559999465942383,
              y: 1,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 17.588451385498047,
          },
        },
        {
          key: "dr5ru4rgep",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: 1,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 16.650056838989258,
          },
        },
        {
          key: "dr5ru4rgen",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: 0.25,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.623760223388672,
          },
        },
        {
          key: "dr5ru4rgef",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: -2,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.54261016845703,
          },
        },
        {
          key: "dr5ru4rge9",
          doc_count: 2,
          center: {
            location: {
              x: 18.5,
              y: -2.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.668153762817383,
          },
        },
        {
          key: "dr5ru4rgdw",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: 0.25,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.74423885345459,
          },
        },
        {
          key: "dr5ru4rgds",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -1,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.773881912231445,
          },
        },
        {
          key: "dr5ru4rgdn",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: 0.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.86971664428711,
          },
        },
        {
          key: "dr5ru4rgd9",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -2.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.950505256652832,
          },
        },
        {
          key: "dr5ru4rgd5",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: -1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.947184562683105,
          },
        },
        {
          key: "dr5ru4rgcy",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: 5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.926190376281738,
          },
        },
        {
          key: "dr5ru4rgce",
          doc_count: 2,
          center: {
            location: {
              x: 10.979999542236328,
              y: 3.5,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 11.52433967590332,
          },
        },
        {
          key: "dr5ru4rgc3",
          doc_count: 2,
          center: {
            location: {
              x: 10.039999961853027,
              y: 2,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.237265586853027,
          },
        },
        {
          key: "dr5ru4rgc0",
          doc_count: 2,
          center: {
            location: {
              x: 9.100000381469727,
              y: 1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.222797393798828,
          },
        },
        {
          key: "dr5ru4rgbq",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: 5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.027353286743164,
          },
        },
        {
          key: "dr5ru4rgbp",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: 5.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.665872573852539,
          },
        },
        {
          key: "dr5ru4rgbn",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: 5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.315435886383057,
          },
        },
        {
          key: "dr5ru4rgbb",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: 1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.296722412109375,
          },
        },
        {
          key: "dr5ru4rgb9",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: 2,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.491888999938965,
          },
        },
        {
          key: "dr5ru4rgb8",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: 1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.374171257019043,
          },
        },
        {
          key: "dr5ru4rg9z",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: 1,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 11.961873054504395,
          },
        },
        {
          key: "dr5ru4rg9u",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: -1,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.961873054504395,
          },
        },
        {
          key: "dr5ru4rg9d",
          doc_count: 2,
          center: {
            location: {
              x: 10.979999542236328,
              y: -2,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.160662651062012,
          },
        },
        {
          key: "dr5ru4rg8r",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: 1,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.359119415283203,
          },
        },
        {
          key: "dr5ru4rg8f",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: -2,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.40152359008789,
          },
        },
        {
          key: "dr5ru4rg8d",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: -2,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.491888999938965,
          },
        },
        {
          key: "dr5ru4rg88",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: -3.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.023614883422852,
          },
        },
        {
          key: "dr5ru4rg87",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: -1.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.456655502319336,
          },
        },
        {
          key: "dr5ru4rg7j",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: -5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.355817794799805,
          },
        },
        {
          key: "dr5ru4rg6t",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.564948081970215,
          },
        },
        {
          key: "dr5ru4rg66",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: -7,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.473849296569824,
          },
        },
        {
          key: "dr5ru4rg60",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: -8,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.145282745361328,
          },
        },
        {
          key: "dr5ru4rg5p",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: -8.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.78392505645752,
          },
        },
        {
          key: "dr5ru4rg4x",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -8.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.142821311950684,
          },
        },
        {
          key: "dr5ru4rg4q",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: -9.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.75380516052246,
          },
        },
        {
          key: "dr5ru4rg4e",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -11,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.392051696777344,
          },
        },
        {
          key: "dr5ru4rg3y",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: -4.5,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 12.741129875183105,
          },
        },
        {
          key: "dr5ru4rg3u",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: -5.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.23629903793335,
          },
        },
        {
          key: "dr5ru4rg3r",
          doc_count: 2,
          center: {
            location: {
              x: 10.039999961853027,
              y: -4,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 10.807478904724121,
          },
        },
        {
          key: "dr5ru4rg3p",
          doc_count: 2,
          center: {
            location: {
              x: 9.100000381469727,
              y: -4,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.940321922302246,
          },
        },
        {
          key: "dr5ru4rg3d",
          doc_count: 2,
          center: {
            location: {
              x: 10.979999542236328,
              y: -7,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.021535873413086,
          },
        },
        {
          key: "dr5ru4rg2z",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: -4,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.087661743164062,
          },
        },
        {
          key: "dr5ru4rg2s",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: -5.75,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.231963634490967,
          },
        },
        {
          key: "dr5ru4rg2p",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: -4,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 6.672001361846924,
          },
        },
        {
          key: "dr5ru4rg2m",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: -5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.027353286743164,
          },
        },
        {
          key: "dr5ru4rg2e",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: -6.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.71485424041748,
          },
        },
        {
          key: "dr5ru4rg27",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: -6.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.038163185119629,
          },
        },
        {
          key: "dr5ru4rg1p",
          doc_count: 2,
          center: {
            location: {
              x: 9.100000381469727,
              y: -8.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.625568389892578,
          },
        },
        {
          key: "dr5ru4rg1k",
          doc_count: 2,
          center: {
            location: {
              x: 10.039999961853027,
              y: -10.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.527615547180176,
          },
        },
        {
          key: "dr5ru4rg1c",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: -12.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.272417068481445,
          },
        },
        {
          key: "dr5ru4rg19",
          doc_count: 2,
          center: {
            location: {
              x: 10.979999542236328,
              y: -12.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.63762092590332,
          },
        },
        {
          key: "dr5ru4rg0r",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: -8.75,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.771358489990234,
          },
        },
        {
          key: "dr5ru4rg0j",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: -10,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.336472511291504,
          },
        },
        {
          key: "dr5ru4rg0f",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: -12,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.511568069458008,
          },
        },
        {
          key: "dr5ru4rg0e",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: -11,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.15782642364502,
          },
        },
        {
          key: "dr5ru4rg08",
          doc_count: 2,
          center: {
            location: {
              x: 7.21999979019165,
              y: -13,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.870387077331543,
          },
        },
        {
          key: "dr5ru4rfud",
          doc_count: 2,
          center: {
            location: {
              x: 22.260000228881836,
              y: -16.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.708438873291016,
          },
        },
        {
          key: "dr5ru4rfu5",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: -16,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.910314559936523,
          },
        },
        {
          key: "dr5ru4rfsp",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: -18.25,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.3576602935791,
          },
        },
        {
          key: "dr5ru4rfsj",
          doc_count: 2,
          center: {
            location: {
              x: 20.3799991607666,
              y: -19.5,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 28.206283569335938,
          },
        },
        {
          key: "dr5ru4rfgy",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: -14,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.956493377685547,
          },
        },
        {
          key: "dr5ru4rfgg",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: -16,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.177640914916992,
          },
        },
        {
          key: "dr5ru4rfgc",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: -17,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.824670791625977,
          },
        },
        {
          key: "dr5ru4rfgb",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: -17.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.15652084350586,
          },
        },
        {
          key: "dr5ru4rffy",
          doc_count: 2,
          center: {
            location: {
              x: 15.680000305175781,
              y: -14,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 21.020523071289062,
          },
        },
        {
          key: "dr5ru4rff8",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -17.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.88050651550293,
          },
        },
        {
          key: "dr5ru4rfez",
          doc_count: 2,
          center: {
            location: {
              x: 19.440000534057617,
              y: -18,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.49365234375,
          },
        },
        {
          key: "dr5ru4rfeq",
          doc_count: 2,
          center: {
            location: {
              x: 17.559999465942383,
              y: -19,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.871868133544922,
          },
        },
        {
          key: "dr5ru4rfen",
          doc_count: 2,
          center: {
            location: {
              x: 16.6200008392334,
              y: -19,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.243303298950195,
          },
        },
        {
          key: "dr5ru4rfdw",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -19,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.047195434570312,
          },
        },
        {
          key: "dr5ru4rfdu",
          doc_count: 2,
          center: {
            location: {
              x: 15.680000305175781,
              y: -20,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.413822174072266,
          },
        },
        {
          key: "dr5ru4rfdr",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: -18.25,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.880674362182617,
          },
        },
        {
          key: "dr5ru4rfdh",
          doc_count: 2,
          center: {
            location: {
              x: 12.859999656677246,
              y: -20,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.777711868286133,
          },
        },
        {
          key: "dr5ru4rfde",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -20.5,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 25.24911117553711,
          },
        },
        {
          key: "dr5ru4rfdd",
          doc_count: 2,
          center: {
            location: {
              x: 14.739999771118164,
              y: -21,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.656726837158203,
          },
        },
        {
          key: "dr5ru4rfd7",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: -20.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.712142944335938,
          },
        },
        {
          key: "dr5ru4rfd2",
          doc_count: 2,
          center: {
            location: {
              x: 13.800000190734863,
              y: -22.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.394886016845703,
          },
        },
        {
          key: "dr5ru4rfbr",
          doc_count: 2,
          center: {
            location: {
              x: 6.28000020980835,
              y: -13.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.889204025268555,
          },
        },
        {
          key: "dr5ru4rf9u",
          doc_count: 2,
          center: {
            location: {
              x: 11.920000076293945,
              y: -20,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.28274917602539,
          },
        },
        {
          key: "dr5ru4rf9e",
          doc_count: 2,
          center: {
            location: {
              x: 10.979999542236328,
              y: -20.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.25533103942871,
          },
        },
        {
          key: "dr5ru4rf9d",
          doc_count: 2,
          center: {
            location: {
              x: 10.979999542236328,
              y: -21.25,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.919365882873535,
          },
        },
        {
          key: "dr5ru4rf93",
          doc_count: 2,
          center: {
            location: {
              x: 10.039999961853027,
              y: -22,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.18267059326172,
          },
        },
        {
          key: "dr5ru4rf80",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: -22.5,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.125,
          },
        },
        {
          key: "dr5ru4rf3r",
          doc_count: 2,
          center: {
            location: {
              x: 10.039999961853027,
              y: -23,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.095848083496094,
          },
        },
        {
          key: "dr5ru4rf2z",
          doc_count: 2,
          center: {
            location: {
              x: 8.15999984741211,
              y: -23,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.40462303161621,
          },
        },
        {
          key: "dr5ru4rf2p",
          doc_count: 2,
          center: {
            location: {
              x: 5.340000152587891,
              y: -23,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.61176872253418,
          },
        },
        {
          key: "dr5ru4rezu",
          doc_count: 2,
          center: {
            location: {
              x: 4.400000095367432,
              y: 4,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 5.946427345275879,
          },
        },
        {
          key: "dr5ru4rew4",
          doc_count: 2,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -2,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 2.353210687637329,
          },
        },
        {
          key: "dr5ru4rew1",
          doc_count: 2,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -2.5,
            },
            count: 2,
          },
          total_pts: {
            value: 4,
          },
          avg_dist: {
            value: 2.7906272411346436,
          },
        },
        {
          key: "dr5ru4revd",
          doc_count: 2,
          center: {
            location: {
              x: -3.119999885559082,
              y: 2.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 3.99804949760437,
          },
        },
        {
          key: "dr5ru4rev9",
          doc_count: 2,
          center: {
            location: {
              x: -3.119999885559082,
              y: 2,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 3.7059950828552246,
          },
        },
        {
          key: "dr5ru4retw",
          doc_count: 2,
          center: {
            location: {
              x: -3.119999885559082,
              y: 0.25,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 3.1399049758911133,
          },
        },
        {
          key: "dr5ru4retf",
          doc_count: 2,
          center: {
            location: {
              x: -2.180000066757202,
              y: -2,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 2.9584455490112305,
          },
        },
        {
          key: "dr5ru4rerx",
          doc_count: 2,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -4,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 5.288818359375,
          },
        },
        {
          key: "dr5ru4rerg",
          doc_count: 2,
          center: {
            location: {
              x: 4.400000095367432,
              y: -6.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.849203586578369,
          },
        },
        {
          key: "dr5ru4rere",
          doc_count: 2,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -6.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.363531589508057,
          },
        },
        {
          key: "dr5ru4req1",
          doc_count: 2,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -7.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.601815700531006,
          },
        },
        {
          key: "dr5ru4repz",
          doc_count: 2,
          center: {
            location: {
              x: 4.400000095367432,
              y: -8.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.571310997009277,
          },
        },
        {
          key: "dr5ru4repx",
          doc_count: 2,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -8.75,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.409705638885498,
          },
        },
        {
          key: "dr5ru4repr",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -8.75,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.105915069580078,
          },
        },
        {
          key: "dr5ru4repm",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -10,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.31263256072998,
          },
        },
        {
          key: "dr5ru4repk",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -10.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.798166275024414,
          },
        },
        {
          key: "dr5ru4rep4",
          doc_count: 2,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -11.5,
            },
            count: 2,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.608031272888184,
          },
        },
        {
          key: "dr5ru4renc",
          doc_count: 2,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -12.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.516373634338379,
          },
        },
        {
          key: "dr5ru4rdzp",
          doc_count: 2,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -13.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.592144966125488,
          },
        },
        {
          key: "dr5ru4rdx3",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -22,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.143856048583984,
          },
        },
        {
          key: "dr5ru4rdrv",
          doc_count: 2,
          center: {
            location: {
              x: 4.400000095367432,
              y: -24.25,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.64598274230957,
          },
        },
        {
          key: "dr5ru4rdrt",
          doc_count: 2,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -24,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.248125076293945,
          },
        },
        {
          key: "dr5ru4rdrq",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -23.5,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.634729385375977,
          },
        },
        {
          key: "dr5ru4rdrm",
          doc_count: 2,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -24.25,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.380598068237305,
          },
        },
        {
          key: "dr5ru4rdqv",
          doc_count: 2,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -24.25,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.258444786071777,
          },
        },
        {
          key: "dr5ru4rdqp",
          doc_count: 2,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -23,
            },
            count: 2,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.033401489257812,
          },
        },
        {
          key: "dr5ru4rdqj",
          doc_count: 2,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -24,
            },
            count: 2,
          },
          total_pts: {
            value: 6,
          },
          avg_dist: {
            value: 24.032011032104492,
          },
        },
        {
          key: "dr5ru4rdmz",
          doc_count: 2,
          center: {
            location: {
              x: -2.180000066757202,
              y: -23,
            },
            count: 2,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.10308265686035,
          },
        },
        {
          key: "dr5ru62h8j",
          doc_count: 1,
          center: {
            location: {
              x: 34.47999954223633,
              y: 18.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 39.12953186035156,
          },
        },
        {
          key: "dr5ru6251v",
          doc_count: 1,
          center: {
            location: {
              x: 41.060001373291016,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 42.260189056396484,
          },
        },
        {
          key: "dr5ru624tm",
          doc_count: 1,
          center: {
            location: {
              x: 53.279998779296875,
              y: -19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 56.736305236816406,
          },
        },
        {
          key: "dr5ru4ruw1",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 31.608409881591797,
          },
        },
        {
          key: "dr5ru4ruw0",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: 15.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 31.09809684753418,
          },
        },
        {
          key: "dr5ru4ruud",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: 21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 30.94765853881836,
          },
        },
        {
          key: "dr5ru4rutw",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: 19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 31.768796920776367,
          },
        },
        {
          key: "dr5ru4rutu",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 18,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 31.639223098754883,
          },
        },
        {
          key: "dr5ru4ruth",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: 18,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.363924026489258,
          },
        },
        {
          key: "dr5ru4rutc",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 30.810556411743164,
          },
        },
        {
          key: "dr5ru4rut4",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: 17,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.76177978515625,
          },
        },
        {
          key: "dr5ru4rut2",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: 16,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.961000442504883,
          },
        },
        {
          key: "dr5ru4rust",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: 19,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.266151428222656,
          },
        },
        {
          key: "dr5ru4rusm",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: 18.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.227510452270508,
          },
        },
        {
          key: "dr5ru4rus6",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: 17,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.267972946166992,
          },
        },
        {
          key: "dr5ru4rus3",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.959087371826172,
          },
        },
        {
          key: "dr5ru4rurd",
          doc_count: 1,
          center: {
            location: {
              x: 32.599998474121094,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 34.73845291137695,
          },
        },
        {
          key: "dr5ru4runq",
          doc_count: 1,
          center: {
            location: {
              x: 27.899999618530273,
              y: 9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.473037719726562,
          },
        },
        {
          key: "dr5ru4runh",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.268207550048828,
          },
        },
        {
          key: "dr5ru4run9",
          doc_count: 1,
          center: {
            location: {
              x: 28.84000015258789,
              y: 6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.563417434692383,
          },
        },
        {
          key: "dr5ru4run1",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: 6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.732500076293945,
          },
        },
        {
          key: "dr5ru4rumy",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.78742027282715,
          },
        },
        {
          key: "dr5ru4rumx",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.223388671875,
          },
        },
        {
          key: "dr5ru4rumu",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.313655853271484,
          },
        },
        {
          key: "dr5ru4rums",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: 13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.482563018798828,
          },
        },
        {
          key: "dr5ru4rump",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.626798629760742,
          },
        },
        {
          key: "dr5ru4rumm",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: 14,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.905906677246094,
          },
        },
        {
          key: "dr5ru4rumk",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: 13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.658445358276367,
          },
        },
        {
          key: "dr5ru4rumj",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: 14,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.09686279296875,
          },
        },
        {
          key: "dr5ru4rumf",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.6538028717041,
          },
        },
        {
          key: "dr5ru4rume",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: 12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 28.02242660522461,
          },
        },
        {
          key: "dr5ru4rumb",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.249608993530273,
          },
        },
        {
          key: "dr5ru4rum5",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: 13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.593984603881836,
          },
        },
        {
          key: "dr5ru4rum4",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.11972427368164,
          },
        },
        {
          key: "dr5ru4rum2",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: 11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.528091430664062,
          },
        },
        {
          key: "dr5ru4rum0",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: 11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.675668716430664,
          },
        },
        {
          key: "dr5ru4rukw",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: 14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.566099166870117,
          },
        },
        {
          key: "dr5ru4ruk0",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: 11,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.15911102294922,
          },
        },
        {
          key: "dr5ru4rujz",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.05869483947754,
          },
        },
        {
          key: "dr5ru4rujy",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 10,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.875444412231445,
          },
        },
        {
          key: "dr5ru4ruju",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.3731689453125,
          },
        },
        {
          key: "dr5ru4rujs",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.481246948242188,
          },
        },
        {
          key: "dr5ru4rujr",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: 10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.324695587158203,
          },
        },
        {
          key: "dr5ru4rujb",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.702816009521484,
          },
        },
        {
          key: "dr5ru4ruj4",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: 7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.382165908813477,
          },
        },
        {
          key: "dr5ru4ruj2",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.87447738647461,
          },
        },
        {
          key: "dr5ru4ruhx",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: 10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.61214256286621,
          },
        },
        {
          key: "dr5ru4ruhk",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.95195770263672,
          },
        },
        {
          key: "dr5ru4ruh0",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 21.2448673248291,
          },
        },
        {
          key: "dr5ru4rugb",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: 20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.251789093017578,
          },
        },
        {
          key: "dr5ru4rufh",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 23,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.351083755493164,
          },
        },
        {
          key: "dr5ru4rufc",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 21,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.208059310913086,
          },
        },
        {
          key: "dr5ru4ruf8",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.24911117553711,
          },
        },
        {
          key: "dr5ru4ruf6",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.54779815673828,
          },
        },
        {
          key: "dr5ru4ruf4",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.052536010742188,
          },
        },
        {
          key: "dr5ru4ruf0",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.199785232543945,
          },
        },
        {
          key: "dr5ru4ruey",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: 19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.534770965576172,
          },
        },
        {
          key: "dr5ru4ruex",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 20,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.244264602661133,
          },
        },
        {
          key: "dr5ru4ruew",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.87936019897461,
          },
        },
        {
          key: "dr5ru4ruev",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: 19,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.182964324951172,
          },
        },
        {
          key: "dr5ru4ruet",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 19,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.518861770629883,
          },
        },
        {
          key: "dr5ru4ruep",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 20,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.004314422607422,
          },
        },
        {
          key: "dr5ru4ruek",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 18,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.146642684936523,
          },
        },
        {
          key: "dr5ru4rued",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 17,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.12468910217285,
          },
        },
        {
          key: "dr5ru4rue9",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.78911018371582,
          },
        },
        {
          key: "dr5ru4rue6",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 17,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.440818786621094,
          },
        },
        {
          key: "dr5ru4rue1",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.419530868530273,
          },
        },
        {
          key: "dr5ru4rudz",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 20,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.413822174072266,
          },
        },
        {
          key: "dr5ru4ruds",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 18,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.26515769958496,
          },
        },
        {
          key: "dr5ru4rudk",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 18,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.681270599365234,
          },
        },
        {
          key: "dr5ru4rudj",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 19,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.942964553833008,
          },
        },
        {
          key: "dr5ru4rudg",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 17.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.497072219848633,
          },
        },
        {
          key: "dr5ru4rude",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 17.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.88050651550293,
          },
        },
        {
          key: "dr5ru4rud2",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 16,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 21.129127502441406,
          },
        },
        {
          key: "dr5ru4ruce",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 22,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.587810516357422,
          },
        },
        {
          key: "dr5ru4rucb",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.713632583618164,
          },
        },
        {
          key: "dr5ru4ruc6",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: 21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.728708267211914,
          },
        },
        {
          key: "dr5ru4rubw",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 24,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.062490463256836,
          },
        },
        {
          key: "dr5ru4rubs",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 23,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.106605529785156,
          },
        },
        {
          key: "dr5ru4rubq",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 24,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.80803108215332,
          },
        },
        {
          key: "dr5ru4rubp",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 24.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.075199127197266,
          },
        },
        {
          key: "dr5ru4rubn",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 24,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.586898803710938,
          },
        },
        {
          key: "dr5ru4rubk",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 23,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.84194564819336,
          },
        },
        {
          key: "dr5ru4rubd",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.679912567138672,
          },
        },
        {
          key: "dr5ru4rub2",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 21.440345764160156,
          },
        },
        {
          key: "dr5ru4ru9z",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 20,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.28274917602539,
          },
        },
        {
          key: "dr5ru4ru9w",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.378793716430664,
          },
        },
        {
          key: "dr5ru4ru9j",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 18.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.61698341369629,
          },
        },
        {
          key: "dr5ru4ru9b",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 16,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.952102661132812,
          },
        },
        {
          key: "dr5ru4ru8w",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.793710708618164,
          },
        },
        {
          key: "dr5ru4ru83",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.654699325561523,
          },
        },
        {
          key: "dr5ru4ru82",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 16,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.188322067260742,
          },
        },
        {
          key: "dr5ru4ru7x",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.8170108795166,
          },
        },
        {
          key: "dr5ru4ru7w",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.50531768798828,
          },
        },
        {
          key: "dr5ru4ru7t",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 14,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.20021629333496,
          },
        },
        {
          key: "dr5ru4ru7r",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.094449996948242,
          },
        },
        {
          key: "dr5ru4ru74",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.49937629699707,
          },
        },
        {
          key: "dr5ru4ru71",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.21074867248535,
          },
        },
        {
          key: "dr5ru4ru6k",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.3051815032959,
          },
        },
        {
          key: "dr5ru4ru6h",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.644826889038086,
          },
        },
        {
          key: "dr5ru4ru6e",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.326602935791016,
          },
        },
        {
          key: "dr5ru4ru6d",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.00704002380371,
          },
        },
        {
          key: "dr5ru4ru6b",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.15365219116211,
          },
        },
        {
          key: "dr5ru4ru69",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.695390701293945,
          },
        },
        {
          key: "dr5ru4ru68",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.392051696777344,
          },
        },
        {
          key: "dr5ru4ru65",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.286048889160156,
          },
        },
        {
          key: "dr5ru4ru5w",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.796634674072266,
          },
        },
        {
          key: "dr5ru4ru5q",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.965059280395508,
          },
        },
        {
          key: "dr5ru4ru5j",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.900381088256836,
          },
        },
        {
          key: "dr5ru4ru5e",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.155643463134766,
          },
        },
        {
          key: "dr5ru4ru5b",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.344865798950195,
          },
        },
        {
          key: "dr5ru4ru59",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.608671188354492,
          },
        },
        {
          key: "dr5ru4ru57",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.296466827392578,
          },
        },
        {
          key: "dr5ru4ru53",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.724411010742188,
          },
        },
        {
          key: "dr5ru4ru51",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.033979415893555,
          },
        },
        {
          key: "dr5ru4ru4v",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.079336166381836,
          },
        },
        {
          key: "dr5ru4ru4t",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.27042579650879,
          },
        },
        {
          key: "dr5ru4ru4s",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.015216827392578,
          },
        },
        {
          key: "dr5ru4ru4r",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.340415954589844,
          },
        },
        {
          key: "dr5ru4ru4g",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.602909088134766,
          },
        },
        {
          key: "dr5ru4ru4c",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.973873138427734,
          },
        },
        {
          key: "dr5ru4ru4b",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.78875732421875,
          },
        },
        {
          key: "dr5ru4ru47",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.951175689697266,
          },
        },
        {
          key: "dr5ru4ru45",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.145282745361328,
          },
        },
        {
          key: "dr5ru4ru43",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.254179954528809,
          },
        },
        {
          key: "dr5ru4ru3z",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.15949821472168,
          },
        },
        {
          key: "dr5ru4ru3y",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.770626068115234,
          },
        },
        {
          key: "dr5ru4ru3x",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.58925437927246,
          },
        },
        {
          key: "dr5ru4ru3p",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.54451560974121,
          },
        },
        {
          key: "dr5ru4ru3j",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 14,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.69760513305664,
          },
        },
        {
          key: "dr5ru4ru3e",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.63762092590332,
          },
        },
        {
          key: "dr5ru4ru3d",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.26531219482422,
          },
        },
        {
          key: "dr5ru4ru3c",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.56310272216797,
          },
        },
        {
          key: "dr5ru4ru39",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.900012969970703,
          },
        },
        {
          key: "dr5ru4ru36",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.646137237548828,
          },
        },
        {
          key: "dr5ru4ru2w",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.19809913635254,
          },
        },
        {
          key: "dr5ru4ru2p",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.922173500061035,
          },
        },
        {
          key: "dr5ru4ru2g",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: 12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.927679061889648,
          },
        },
        {
          key: "dr5ru4ru2e",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.435317993164062,
          },
        },
        {
          key: "dr5ru4ru2b",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: 11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.696188926696777,
          },
        },
        {
          key: "dr5ru4ru27",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.988866806030273,
          },
        },
        {
          key: "dr5ru4ru25",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 13,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.054024696350098,
          },
        },
        {
          key: "dr5ru4ru23",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.102992057800293,
          },
        },
        {
          key: "dr5ru4ru1y",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.242585182189941,
          },
        },
        {
          key: "dr5ru4ru1w",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 10,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.851276397705078,
          },
        },
        {
          key: "dr5ru4ru1u",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.64023208618164,
          },
        },
        {
          key: "dr5ru4ru1p",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.894603729248047,
          },
        },
        {
          key: "dr5ru4ru1k",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.154908180236816,
          },
        },
        {
          key: "dr5ru4ru1j",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.798828125,
          },
        },
        {
          key: "dr5ru4ru1h",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.452308654785156,
          },
        },
        {
          key: "dr5ru4ru1e",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.58530044555664,
          },
        },
        {
          key: "dr5ru4ru16",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: 7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.532023429870605,
          },
        },
        {
          key: "dr5ru4ru14",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.792370796203613,
          },
        },
        {
          key: "dr5ru4ru11",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.183022499084473,
          },
        },
        {
          key: "dr5ru4ru0q",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.388081550598145,
          },
        },
        {
          key: "dr5ru4ru0p",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.779881477355957,
          },
        },
        {
          key: "dr5ru4ru0n",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 10,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.336472511291504,
          },
        },
        {
          key: "dr5ru4ru0k",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.568273544311523,
          },
        },
        {
          key: "dr5ru4ru0j",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.464970588684082,
          },
        },
        {
          key: "dr5ru4ru0h",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.038207054138184,
          },
        },
        {
          key: "dr5ru4ru0d",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.410494804382324,
          },
        },
        {
          key: "dr5ru4ru0b",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.12845516204834,
          },
        },
        {
          key: "dr5ru4ru07",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.170467376708984,
          },
        },
        {
          key: "dr5ru4ru05",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.618502616882324,
          },
        },
        {
          key: "dr5ru4ru04",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.206823348999023,
          },
        },
        {
          key: "dr5ru4ru01",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.80429458618164,
          },
        },
        {
          key: "dr5ru4ru00",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.032160758972168,
          },
        },
        {
          key: "dr5ru4rszr",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 24.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.62925910949707,
          },
        },
        {
          key: "dr5ru4rszq",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 24,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.13193702697754,
          },
        },
        {
          key: "dr5ru4rszb",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: 20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.96687889099121,
          },
        },
        {
          key: "dr5ru4rsz7",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 22.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.64068031311035,
          },
        },
        {
          key: "dr5ru4rsz4",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 21.5579776763916,
          },
        },
        {
          key: "dr5ru4rsyx",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 24.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.5018367767334,
          },
        },
        {
          key: "dr5ru4rsyn",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 24,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.032011032104492,
          },
        },
        {
          key: "dr5ru4rsxc",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.07659149169922,
          },
        },
        {
          key: "dr5ru4rsx9",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.85887336730957,
          },
        },
        {
          key: "dr5ru4rsx8",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 15.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.881485939025879,
          },
        },
        {
          key: "dr5ru4rsx7",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 17.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.680509567260742,
          },
        },
        {
          key: "dr5ru4rsx4",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 17,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.073265075683594,
          },
        },
        {
          key: "dr5ru4rswv",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 19,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.01077651977539,
          },
        },
        {
          key: "dr5ru4rswn",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.539386749267578,
          },
        },
        {
          key: "dr5ru4rswc",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.512407302856445,
          },
        },
        {
          key: "dr5ru4rswb",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 16,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.012794494628906,
          },
        },
        {
          key: "dr5ru4rsw0",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 15.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.549520492553711,
          },
        },
        {
          key: "dr5ru4rsvw",
          doc_count: 1,
          center: {
            location: {
              x: -3.119999885559082,
              y: 24,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.201950073242188,
          },
        },
        {
          key: "dr5ru4rsrz",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.632018089294434,
          },
        },
        {
          key: "dr5ru4rsry",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: 14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.152887344360352,
          },
        },
        {
          key: "dr5ru4rsrr",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.210206985473633,
          },
        },
        {
          key: "dr5ru4rsrd",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.488859176635742,
          },
        },
        {
          key: "dr5ru4rsr9",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.00922966003418,
          },
        },
        {
          key: "dr5ru4rsr1",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.608031272888184,
          },
        },
        {
          key: "dr5ru4rsqx",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 15,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.002999305725098,
          },
        },
        {
          key: "dr5ru4rsqw",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.503103256225586,
          },
        },
        {
          key: "dr5ru4rsqv",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 14,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.014620780944824,
          },
        },
        {
          key: "dr5ru4rsqn",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.552924156188965,
          },
        },
        {
          key: "dr5ru4rsqj",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 14,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.05480670928955,
          },
        },
        {
          key: "dr5ru4rsqg",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.01574420928955,
          },
        },
        {
          key: "dr5ru4rsqf",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.017054557800293,
          },
        },
        {
          key: "dr5ru4rsqd",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.00374984741211,
          },
        },
        {
          key: "dr5ru4rsq5",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.56135368347168,
          },
        },
        {
          key: "dr5ru4rsq0",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.069670677185059,
          },
        },
        {
          key: "dr5ru4rspy",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: 9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.46947956085205,
          },
        },
        {
          key: "dr5ru4rspx",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.055387496948242,
          },
        },
        {
          key: "dr5ru4rspw",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.110469818115234,
          },
        },
        {
          key: "dr5ru4rspt",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.642178535461426,
          },
        },
        {
          key: "dr5ru4rspj",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.137636184692383,
          },
        },
        {
          key: "dr5ru4rspd",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.259636878967285,
          },
        },
        {
          key: "dr5ru4rspc",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: 7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.268011093139648,
          },
        },
        {
          key: "dr5ru4rspb",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.440430164337158,
          },
        },
        {
          key: "dr5ru4rsp9",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.363531589508057,
          },
        },
        {
          key: "dr5ru4rsp6",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.912041664123535,
          },
        },
        {
          key: "dr5ru4rsp5",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.154532432556152,
          },
        },
        {
          key: "dr5ru4rsp0",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.204546928405762,
          },
        },
        {
          key: "dr5ru4rsny",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 10,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.020459175109863,
          },
        },
        {
          key: "dr5ru4rsnv",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.022727012634277,
          },
        },
        {
          key: "dr5ru4rsns",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.505292892456055,
          },
        },
        {
          key: "dr5ru4rsnn",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.580584526062012,
          },
        },
        {
          key: "dr5ru4rsnj",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 9,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.085021018981934,
          },
        },
        {
          key: "dr5ru4rsnb",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.034036636352539,
          },
        },
        {
          key: "dr5ru4rsn9",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.006425857543945,
          },
        },
        {
          key: "dr5ru4rsn8",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 6,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 6.007495403289795,
          },
        },
        {
          key: "dr5ru4rsmf",
          doc_count: 1,
          center: {
            location: {
              x: -2.180000066757202,
              y: 12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.196409225463867,
          },
        },
        {
          key: "dr5ru4rgyt",
          doc_count: 1,
          center: {
            location: {
              x: 28.84000015258789,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 29.188962936401367,
          },
        },
        {
          key: "dr5ru4rgy3",
          doc_count: 1,
          center: {
            location: {
              x: 27.899999618530273,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.97159194946289,
          },
        },
        {
          key: "dr5ru4rgy0",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: 1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.00169563293457,
          },
        },
        {
          key: "dr5ru4rgxm",
          doc_count: 1,
          center: {
            location: {
              x: 31.65999984741211,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 31.66394805908203,
          },
        },
        {
          key: "dr5ru4rgxh",
          doc_count: 1,
          center: {
            location: {
              x: 30.719999313354492,
              y: -1,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 30.736270904541016,
          },
        },
        {
          key: "dr5ru4rgwy",
          doc_count: 1,
          center: {
            location: {
              x: 29.780000686645508,
              y: 0,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.780000686645508,
          },
        },
        {
          key: "dr5ru4rgwm",
          doc_count: 1,
          center: {
            location: {
              x: 27.899999618530273,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.90447998046875,
          },
        },
        {
          key: "dr5ru4rgwj",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.964635848999023,
          },
        },
        {
          key: "dr5ru4rgw9",
          doc_count: 1,
          center: {
            location: {
              x: 28.84000015258789,
              y: -3,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.99561309814453,
          },
        },
        {
          key: "dr5ru4rgw6",
          doc_count: 1,
          center: {
            location: {
              x: 27.899999618530273,
              y: -2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.97159194946289,
          },
        },
        {
          key: "dr5ru4rgw4",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: -2,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.034082412719727,
          },
        },
        {
          key: "dr5ru4rgw0",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: -3.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.18623924255371,
          },
        },
        {
          key: "dr5ru4rgvu",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.325660705566406,
          },
        },
        {
          key: "dr5ru4rgvr",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.75862693786621,
          },
        },
        {
          key: "dr5ru4rgvc",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.096750259399414,
          },
        },
        {
          key: "dr5ru4rgv9",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.159618377685547,
          },
        },
        {
          key: "dr5ru4rgv2",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: 1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.18655776977539,
          },
        },
        {
          key: "dr5ru4rguh",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.76883316040039,
          },
        },
        {
          key: "dr5ru4rgtk",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -1,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.160703659057617,
          },
        },
        {
          key: "dr5ru4rgt8",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -3.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.323040008544922,
          },
        },
        {
          key: "dr5ru4rgt6",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.222707748413086,
          },
        },
        {
          key: "dr5ru4rgt1",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -2.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.334308624267578,
          },
        },
        {
          key: "dr5ru4rgt0",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -3.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.462522506713867,
          },
        },
        {
          key: "dr5ru4rgsr",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: 1,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 21.34343910217285,
          },
        },
        {
          key: "dr5ru4rgsp",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: 1,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.40452003479004,
          },
        },
        {
          key: "dr5ru4rgsh",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: -1,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.40452003479004,
          },
        },
        {
          key: "dr5ru4rgs1",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: -3,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.599620819091797,
          },
        },
        {
          key: "dr5ru4rgqn",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.332977294921875,
          },
        },
        {
          key: "dr5ru4rgqk",
          doc_count: 1,
          center: {
            location: {
              x: 27.899999618530273,
              y: -5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.436946868896484,
          },
        },
        {
          key: "dr5ru4rgqj",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: -5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.419729232788086,
          },
        },
        {
          key: "dr5ru4rgqc",
          doc_count: 1,
          center: {
            location: {
              x: 29.780000686645508,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 30.70990753173828,
          },
        },
        {
          key: "dr5ru4rgq3",
          doc_count: 1,
          center: {
            location: {
              x: 27.899999618530273,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.89048194885254,
          },
        },
        {
          key: "dr5ru4rgq0",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 28.121906280517578,
          },
        },
        {
          key: "dr5ru4rgnx",
          doc_count: 1,
          center: {
            location: {
              x: 28.84000015258789,
              y: -9,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 30.211679458618164,
          },
        },
        {
          key: "dr5ru4rgn6",
          doc_count: 1,
          center: {
            location: {
              x: 27.899999618530273,
              y: -12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 30.371204376220703,
          },
        },
        {
          key: "dr5ru4rgmx",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -4,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.396976470947266,
          },
        },
        {
          key: "dr5ru4rgmw",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.480510711669922,
          },
        },
        {
          key: "dr5ru4rgmu",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: -6,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.702816009521484,
          },
        },
        {
          key: "dr5ru4rgms",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.675989151000977,
          },
        },
        {
          key: "dr5ru4rgmn",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.63239288330078,
          },
        },
        {
          key: "dr5ru4rgmj",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.732677459716797,
          },
        },
        {
          key: "dr5ru4rgme",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.90861701965332,
          },
        },
        {
          key: "dr5ru4rgm9",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.17740249633789,
          },
        },
        {
          key: "dr5ru4rgm6",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.134429931640625,
          },
        },
        {
          key: "dr5ru4rgm3",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.278244018554688,
          },
        },
        {
          key: "dr5ru4rgkh",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: -6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 21.2448673248291,
          },
        },
        {
          key: "dr5ru4rgk5",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 21.391456604003906,
          },
        },
        {
          key: "dr5ru4rgjz",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: -9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.532533645629883,
          },
        },
        {
          key: "dr5ru4rgjw",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.81895637512207,
          },
        },
        {
          key: "dr5ru4rgjv",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.875444412231445,
          },
        },
        {
          key: "dr5ru4rgjq",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.94204330444336,
          },
        },
        {
          key: "dr5ru4rgjn",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.0697021484375,
          },
        },
        {
          key: "dr5ru4rgjh",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.46546745300293,
          },
        },
        {
          key: "dr5ru4rgjf",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: -11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.448030471801758,
          },
        },
        {
          key: "dr5ru4rgje",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.38624382019043,
          },
        },
        {
          key: "dr5ru4rgjd",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.59087562561035,
          },
        },
        {
          key: "dr5ru4rgj7",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.528091430664062,
          },
        },
        {
          key: "dr5ru4rgj6",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.95810890197754,
          },
        },
        {
          key: "dr5ru4rgj5",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.675668716430664,
          },
        },
        {
          key: "dr5ru4rgj2",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -13,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.417869567871094,
          },
        },
        {
          key: "dr5ru4rgj0",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.593984603881836,
          },
        },
        {
          key: "dr5ru4rghw",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.202428817749023,
          },
        },
        {
          key: "dr5ru4rghm",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.548723220825195,
          },
        },
        {
          key: "dr5ru4rgh7",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.99046516418457,
          },
        },
        {
          key: "dr5ru4rgh1",
          doc_count: 1,
          center: {
            location: {
              x: 20.3799991607666,
              y: -12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.90804100036621,
          },
        },
        {
          key: "dr5ru4rggr",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.40118408203125,
          },
        },
        {
          key: "dr5ru4rggq",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.257972717285156,
          },
        },
        {
          key: "dr5ru4rggn",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.355817794799805,
          },
        },
        {
          key: "dr5ru4rggj",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.21843147277832,
          },
        },
        {
          key: "dr5ru4rggc",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.54261016845703,
          },
        },
        {
          key: "dr5ru4rgg9",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.6077938079834,
          },
        },
        {
          key: "dr5ru4rgg7",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 3,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.814420700073242,
          },
        },
        {
          key: "dr5ru4rgg5",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 3.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.984533309936523,
          },
        },
        {
          key: "dr5ru4rgg4",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 2.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.806974411010742,
          },
        },
        {
          key: "dr5ru4rgg3",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.67352867126465,
          },
        },
        {
          key: "dr5ru4rgg1",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.739904403686523,
          },
        },
        {
          key: "dr5ru4rgg0",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: 1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.687551498413086,
          },
        },
        {
          key: "dr5ru4rgfz",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.61663055419922,
          },
        },
        {
          key: "dr5ru4rgfy",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.457897186279297,
          },
        },
        {
          key: "dr5ru4rgfs",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.273100852966309,
          },
        },
        {
          key: "dr5ru4rgfr",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.85563850402832,
          },
        },
        {
          key: "dr5ru4rgfm",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.515164375305176,
          },
        },
        {
          key: "dr5ru4rgfk",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.368020057678223,
          },
        },
        {
          key: "dr5ru4rgfe",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 3,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.042194366455078,
          },
        },
        {
          key: "dr5ru4rgfc",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.807036399841309,
          },
        },
        {
          key: "dr5ru4rgf9",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.875066757202148,
          },
        },
        {
          key: "dr5ru4rgf8",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.816126823425293,
          },
        },
        {
          key: "dr5ru4rgf4",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 2.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.100748062133789,
          },
        },
        {
          key: "dr5ru4rgf3",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.944174766540527,
          },
        },
        {
          key: "dr5ru4rgf1",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.014592170715332,
          },
        },
        {
          key: "dr5ru4rgev",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.446428298950195,
          },
        },
        {
          key: "dr5ru4rget",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.506755828857422,
          },
        },
        {
          key: "dr5ru4rgek",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -1,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.588451385498047,
          },
        },
        {
          key: "dr5ru4rgej",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.627519607543945,
          },
        },
        {
          key: "dr5ru4rgeh",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -1,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.650056838989258,
          },
        },
        {
          key: "dr5ru4rgec",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: -2.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.6000919342041,
          },
        },
        {
          key: "dr5ru4rge7",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.62394905090332,
          },
        },
        {
          key: "dr5ru4rgdx",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: 1,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.773881912231445,
          },
        },
        {
          key: "dr5ru4rgdt",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.748477935791016,
          },
        },
        {
          key: "dr5ru4rgdr",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: 1,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.83618450164795,
          },
        },
        {
          key: "dr5ru4rgdp",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: 1,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.898821830749512,
          },
        },
        {
          key: "dr5ru4rgdk",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: -1,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.83618450164795,
          },
        },
        {
          key: "dr5ru4rgdj",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.86971664428711,
          },
        },
        {
          key: "dr5ru4rgde",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: -1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.816126823425293,
          },
        },
        {
          key: "dr5ru4rgcz",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.12769603729248,
          },
        },
        {
          key: "dr5ru4rgcv",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.741129875183105,
          },
        },
        {
          key: "dr5ru4rgct",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.866355895996094,
          },
        },
        {
          key: "dr5ru4rgcs",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.685906410217285,
          },
        },
        {
          key: "dr5ru4rgcq",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: 5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.216131210327148,
          },
        },
        {
          key: "dr5ru4rgcn",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.383159637451172,
          },
        },
        {
          key: "dr5ru4rgck",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.807478904724121,
          },
        },
        {
          key: "dr5ru4rgcj",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.151846885681152,
          },
        },
        {
          key: "dr5ru4rgch",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.940321922302246,
          },
        },
        {
          key: "dr5ru4rgcf",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: 2.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.179343223571777,
          },
        },
        {
          key: "dr5ru4rgc9",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: 2,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.160662651062012,
          },
        },
        {
          key: "dr5ru4rgc2",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: 1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.151432991027832,
          },
        },
        {
          key: "dr5ru4rgby",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: 5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.570036888122559,
          },
        },
        {
          key: "dr5ru4rgbx",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.076254844665527,
          },
        },
        {
          key: "dr5ru4rgbu",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.087661743164062,
          },
        },
        {
          key: "dr5ru4rgbt",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.507549285888672,
          },
        },
        {
          key: "dr5ru4rgbj",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.983237266540527,
          },
        },
        {
          key: "dr5ru4rgbh",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: 4,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.672001361846924,
          },
        },
        {
          key: "dr5ru4rg9f",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -2,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.086620330810547,
          },
        },
        {
          key: "dr5ru4rg9e",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.081985473632812,
          },
        },
        {
          key: "dr5ru4rg97",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.151432991027832,
          },
        },
        {
          key: "dr5ru4rg96",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -2,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.237265586853027,
          },
        },
        {
          key: "dr5ru4rg95",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.222797393798828,
          },
        },
        {
          key: "dr5ru4rg93",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -2.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.346574783325195,
          },
        },
        {
          key: "dr5ru4rg80",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -3.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.384794235229492,
          },
        },
        {
          key: "dr5ru4rg7s",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.30025863647461,
          },
        },
        {
          key: "dr5ru4rg7r",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -4,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.00981903076172,
          },
        },
        {
          key: "dr5ru4rg7n",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.21843147277832,
          },
        },
        {
          key: "dr5ru4rg7k",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.556766510009766,
          },
        },
        {
          key: "dr5ru4rg7g",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.497892379760742,
          },
        },
        {
          key: "dr5ru4rg79",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.962465286254883,
          },
        },
        {
          key: "dr5ru4rg77",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.724411010742188,
          },
        },
        {
          key: "dr5ru4rg73",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.09459686279297,
          },
        },
        {
          key: "dr5ru4rg72",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.296466827392578,
          },
        },
        {
          key: "dr5ru4rg70",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.445173263549805,
          },
        },
        {
          key: "dr5ru4rg6y",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.312952041625977,
          },
        },
        {
          key: "dr5ru4rg6w",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.411605834960938,
          },
        },
        {
          key: "dr5ru4rg6v",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: -5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.457897186279297,
          },
        },
        {
          key: "dr5ru4rg6p",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -4,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.467724800109863,
          },
        },
        {
          key: "dr5ru4rg6n",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.624595642089844,
          },
        },
        {
          key: "dr5ru4rg6e",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.10955047607422,
          },
        },
        {
          key: "dr5ru4rg6c",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.381380081176758,
          },
        },
        {
          key: "dr5ru4rg68",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.771034240722656,
          },
        },
        {
          key: "dr5ru4rg64",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.641707420349121,
          },
        },
        {
          key: "dr5ru4rg62",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.951175689697266,
          },
        },
        {
          key: "dr5ru4rg5x",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.573040008544922,
          },
        },
        {
          key: "dr5ru4rg5w",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.796634674072266,
          },
        },
        {
          key: "dr5ru4rg5r",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 19.509063720703125,
          },
        },
        {
          key: "dr5ru4rg5m",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.207761764526367,
          },
        },
        {
          key: "dr5ru4rg5k",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.45980453491211,
          },
        },
        {
          key: "dr5ru4rg5c",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: -12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.111980438232422,
          },
        },
        {
          key: "dr5ru4rg57",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 20.720849990844727,
          },
        },
        {
          key: "dr5ru4rg55",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 19.93048858642578,
          },
        },
        {
          key: "dr5ru4rg4z",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: -9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.079336166381836,
          },
        },
        {
          key: "dr5ru4rg4w",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.53618049621582,
          },
        },
        {
          key: "dr5ru4rg4v",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.597375869750977,
          },
        },
        {
          key: "dr5ru4rg4r",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: -8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.207714080810547,
          },
        },
        {
          key: "dr5ru4rg4p",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.415239334106445,
          },
        },
        {
          key: "dr5ru4rg4n",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.988420486450195,
          },
        },
        {
          key: "dr5ru4rg4h",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.602096557617188,
          },
        },
        {
          key: "dr5ru4rg4d",
          doc_count: 1,
          center: {
            location: {
              x: 14.739999771118164,
              y: -11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.695390701293945,
          },
        },
        {
          key: "dr5ru4rg4b",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: -13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.36817169189453,
          },
        },
        {
          key: "dr5ru4rg40",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.286048889160156,
          },
        },
        {
          key: "dr5ru4rg3z",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -4,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.573241233825684,
          },
        },
        {
          key: "dr5ru4rg3t",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.064841270446777,
          },
        },
        {
          key: "dr5ru4rg3s",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.280488967895508,
          },
        },
        {
          key: "dr5ru4rg3q",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.002345085144043,
          },
        },
        {
          key: "dr5ru4rg3n",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.151846885681152,
          },
        },
        {
          key: "dr5ru4rg3m",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.216131210327148,
          },
        },
        {
          key: "dr5ru4rg3k",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.447776794433594,
          },
        },
        {
          key: "dr5ru4rg3g",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.577054023742676,
          },
        },
        {
          key: "dr5ru4rg3f",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.823400497436523,
          },
        },
        {
          key: "dr5ru4rg3e",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.75971794128418,
          },
        },
        {
          key: "dr5ru4rg3c",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.083195686340332,
          },
        },
        {
          key: "dr5ru4rg34",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 11.480854034423828,
          },
        },
        {
          key: "dr5ru4rg30",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.116518020629883,
          },
        },
        {
          key: "dr5ru4rg2x",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: -4,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.253993034362793,
          },
        },
        {
          key: "dr5ru4rg2v",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: -5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.570036888122559,
          },
        },
        {
          key: "dr5ru4rg2u",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: -6,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.12845516204834,
          },
        },
        {
          key: "dr5ru4rg2j",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.315435886383057,
          },
        },
        {
          key: "dr5ru4rg2h",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -6,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.032160758972168,
          },
        },
        {
          key: "dr5ru4rg2f",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.75107479095459,
          },
        },
        {
          key: "dr5ru4rg28",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.776288986206055,
          },
        },
        {
          key: "dr5ru4rg26",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.404169082641602,
          },
        },
        {
          key: "dr5ru4rg24",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.80429458618164,
          },
        },
        {
          key: "dr5ru4rg23",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.782044410705566,
          },
        },
        {
          key: "dr5ru4rg20",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.618502616882324,
          },
        },
        {
          key: "dr5ru4rg1z",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.64023208618164,
          },
        },
        {
          key: "dr5ru4rg1x",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -9,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.197196960449219,
          },
        },
        {
          key: "dr5ru4rg1j",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.52072525024414,
          },
        },
        {
          key: "dr5ru4rg1f",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.56310272216797,
          },
        },
        {
          key: "dr5ru4rg1e",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.542213439941406,
          },
        },
        {
          key: "dr5ru4rg18",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.0164737701416,
          },
        },
        {
          key: "dr5ru4rg14",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -12,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.060212135314941,
          },
        },
        {
          key: "dr5ru4rg11",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.461565017700195,
          },
        },
        {
          key: "dr5ru4rg0z",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: -8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.782852172851562,
          },
        },
        {
          key: "dr5ru4rg0x",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: -8.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.152506828308105,
          },
        },
        {
          key: "dr5ru4rg0u",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: -10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.297954559326172,
          },
        },
        {
          key: "dr5ru4rg0s",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: -10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.742778778076172,
          },
        },
        {
          key: "dr5ru4rg0q",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.388081550598145,
          },
        },
        {
          key: "dr5ru4rg0m",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.808403968811035,
          },
        },
        {
          key: "dr5ru4rg0h",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.779881477355957,
          },
        },
        {
          key: "dr5ru4rg0g",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 13.696188926696777,
          },
        },
        {
          key: "dr5ru4rg06",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.102992057800293,
          },
        },
        {
          key: "dr5ru4rg03",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.988866806030273,
          },
        },
        {
          key: "dr5ru4rfyj",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: -14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 30.61195182800293,
          },
        },
        {
          key: "dr5ru4rfyh",
          doc_count: 1,
          center: {
            location: {
              x: 26.959999084472656,
              y: -15.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 31.09809684753418,
          },
        },
        {
          key: "dr5ru4rfvr",
          doc_count: 1,
          center: {
            location: {
              x: 24.139999389648438,
              y: -13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.658445358276367,
          },
        },
        {
          key: "dr5ru4rfvp",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.84194564819336,
          },
        },
        {
          key: "dr5ru4rfvh",
          doc_count: 1,
          center: {
            location: {
              x: 23.200000762939453,
              y: -15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.626798629760742,
          },
        },
        {
          key: "dr5ru4rfve",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -16,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 29.74905776977539,
          },
        },
        {
          key: "dr5ru4rfvc",
          doc_count: 1,
          center: {
            location: {
              x: 26.020000457763672,
              y: -17,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 31.08119010925293,
          },
        },
        {
          key: "dr5ru4rfut",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: -14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.566099166870117,
          },
        },
        {
          key: "dr5ru4rfuq",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: -14,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.505733489990234,
          },
        },
        {
          key: "dr5ru4rfum",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: -14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.7835693359375,
          },
        },
        {
          key: "dr5ru4rfu9",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: -17,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.009063720703125,
          },
        },
        {
          key: "dr5ru4rfu8",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: -17.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.315324783325195,
          },
        },
        {
          key: "dr5ru4rfu2",
          doc_count: 1,
          center: {
            location: {
              x: 21.31999969482422,
              y: -17.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.58246612548828,
          },
        },
        {
          key: "dr5ru4rftx",
          doc_count: 1,
          center: {
            location: {
              x: 25.079999923706055,
              y: -18,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 30.87080192565918,
          },
        },
        {
          key: "dr5ru4rfss",
          doc_count: 1,
          center: {
            location: {
              x: 22.260000228881836,
              y: -20,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 29.925033569335938,
          },
        },
        {
          key: "dr5ru4rfgx",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.90196418762207,
          },
        },
        {
          key: "dr5ru4rfge",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -16,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.459150314331055,
          },
        },
        {
          key: "dr5ru4rfg8",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -17.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.46566390991211,
          },
        },
        {
          key: "dr5ru4rfg5",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -16,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.069988250732422,
          },
        },
        {
          key: "dr5ru4rfg1",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -17,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.77444839477539,
          },
        },
        {
          key: "dr5ru4rffv",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: -14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 21.356788635253906,
          },
        },
        {
          key: "dr5ru4rffk",
          doc_count: 1,
          center: {
            location: {
              x: 13.800000190734863,
              y: -15,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 20.38234519958496,
          },
        },
        {
          key: "dr5ru4rfew",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -19,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.518861770629883,
          },
        },
        {
          key: "dr5ru4rfev",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: -19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.534770965576172,
          },
        },
        {
          key: "dr5ru4rfes",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -20,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 27.244264602661133,
          },
        },
        {
          key: "dr5ru4rfem",
          doc_count: 1,
          center: {
            location: {
              x: 17.559999465942383,
              y: -19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.241256713867188,
          },
        },
        {
          key: "dr5ru4rfej",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.621755599975586,
          },
        },
        {
          key: "dr5ru4rfeh",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -20,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 26.004314422607422,
          },
        },
        {
          key: "dr5ru4rfeg",
          doc_count: 1,
          center: {
            location: {
              x: 19.440000534057617,
              y: -20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 28.251789093017578,
          },
        },
        {
          key: "dr5ru4rfee",
          doc_count: 1,
          center: {
            location: {
              x: 18.5,
              y: -20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 27.6134033203125,
          },
        },
        {
          key: "dr5ru4rfe5",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -20.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.39080047607422,
          },
        },
        {
          key: "dr5ru4rfe4",
          doc_count: 1,
          center: {
            location: {
              x: 16.6200008392334,
              y: -21,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.78104591369629,
          },
        },
        {
          key: "dr5ru4rfdp",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -18.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.530637741088867,
          },
        },
        {
          key: "dr5ru4rfdj",
          doc_count: 1,
          center: {
            location: {
              x: 12.859999656677246,
              y: -19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.358715057373047,
          },
        },
        {
          key: "dr5ru4rfdf",
          doc_count: 1,
          center: {
            location: {
              x: 15.680000305175781,
              y: -21,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 26.208059310913086,
          },
        },
        {
          key: "dr5ru4rfcx",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.401447296142578,
          },
        },
        {
          key: "dr5ru4rfcq",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -14,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.227930068969727,
          },
        },
        {
          key: "dr5ru4rfcp",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 16.280662536621094,
          },
        },
        {
          key: "dr5ru4rfck",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -15.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.46758270263672,
          },
        },
        {
          key: "dr5ru4rfch",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -15.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.97386932373047,
          },
        },
        {
          key: "dr5ru4rfc4",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 18.843036651611328,
          },
        },
        {
          key: "dr5ru4rfbh",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -15,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.922173500061035,
          },
        },
        {
          key: "dr5ru4rfbe",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: -16,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.553586959838867,
          },
        },
        {
          key: "dr5ru4rfb8",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: -17.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.930885314941406,
          },
        },
        {
          key: "dr5ru4rfb6",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 17.654699325561523,
          },
        },
        {
          key: "dr5ru4rf9v",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -19.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.854679107666016,
          },
        },
        {
          key: "dr5ru4rf9c",
          doc_count: 1,
          center: {
            location: {
              x: 11.920000076293945,
              y: -22,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 25.021718978881836,
          },
        },
        {
          key: "dr5ru4rf99",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -22,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.587810516357422,
          },
        },
        {
          key: "dr5ru4rf94",
          doc_count: 1,
          center: {
            location: {
              x: 9.100000381469727,
              y: -21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.346519470214844,
          },
        },
        {
          key: "dr5ru4rf92",
          doc_count: 1,
          center: {
            location: {
              x: 10.039999961853027,
              y: -22.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.638416290283203,
          },
        },
        {
          key: "dr5ru4rf8d",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: -21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.679912567138672,
          },
        },
        {
          key: "dr5ru4rf8b",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: -22.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 23.933984756469727,
          },
        },
        {
          key: "dr5ru4rf89",
          doc_count: 1,
          center: {
            location: {
              x: 7.21999979019165,
              y: -22,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.154447555541992,
          },
        },
        {
          key: "dr5ru4rf83",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -22,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.87877655029297,
          },
        },
        {
          key: "dr5ru4rf81",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -22,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.63880729675293,
          },
        },
        {
          key: "dr5ru4rf3x",
          doc_count: 1,
          center: {
            location: {
              x: 10.979999542236328,
              y: -23,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.486474990844727,
          },
        },
        {
          key: "dr5ru4rf2v",
          doc_count: 1,
          center: {
            location: {
              x: 8.15999984741211,
              y: -24,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 25.349271774291992,
          },
        },
        {
          key: "dr5ru4rf2r",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -23,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.84194564819336,
          },
        },
        {
          key: "dr5ru4rf2q",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -23.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.32464599609375,
          },
        },
        {
          key: "dr5ru4rf2n",
          doc_count: 1,
          center: {
            location: {
              x: 5.340000152587891,
              y: -23.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 24.099079132080078,
          },
        },
        {
          key: "dr5ru4rf2m",
          doc_count: 1,
          center: {
            location: {
              x: 6.28000020980835,
              y: -24,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.80803108215332,
          },
        },
        {
          key: "dr5ru4rezz",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.043436527252197,
          },
        },
        {
          key: "dr5ru4rezx",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.497815132141113,
          },
        },
        {
          key: "dr5ru4rezr",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: 5.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.049826622009277,
          },
        },
        {
          key: "dr5ru4rezn",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: 5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 5.243700981140137,
          },
        },
        {
          key: "dr5ru4reyt",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: 4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 4.509988784790039,
          },
        },
        {
          key: "dr5ru4rey0",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: 1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 1.9461756944656372,
          },
        },
        {
          key: "dr5ru4rexb",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -3.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 5.62227725982666,
          },
        },
        {
          key: "dr5ru4rew8",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -3.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 3.512833595275879,
          },
        },
        {
          key: "dr5ru4rew0",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -3.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 3.713165760040283,
          },
        },
        {
          key: "dr5ru4revb",
          doc_count: 1,
          center: {
            location: {
              x: -2.180000066757202,
              y: 1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 2.646204948425293,
          },
        },
        {
          key: "dr5ru4rev8",
          doc_count: 1,
          center: {
            location: {
              x: -3.119999885559082,
              y: 1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 3.4618492126464844,
          },
        },
        {
          key: "dr5ru4retz",
          doc_count: 1,
          center: {
            location: {
              x: -2.180000066757202,
              y: 1,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 2.398416042327881,
          },
        },
        {
          key: "dr5ru4retx",
          doc_count: 1,
          center: {
            location: {
              x: -3.119999885559082,
              y: 1,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 3.276339530944824,
          },
        },
        {
          key: "dr5ru4retv",
          doc_count: 1,
          center: {
            location: {
              x: -2.180000066757202,
              y: -0.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 2.2366044521331787,
          },
        },
        {
          key: "dr5ru4retq",
          doc_count: 1,
          center: {
            location: {
              x: -4.059999942779541,
              y: 0,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 4.059999942779541,
          },
        },
        {
          key: "dr5ru4retg",
          doc_count: 1,
          center: {
            location: {
              x: -2.180000066757202,
              y: -1.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 2.646204948425293,
          },
        },
        {
          key: "dr5ru4retc",
          doc_count: 1,
          center: {
            location: {
              x: -2.180000066757202,
              y: -2.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 3.316986560821533,
          },
        },
        {
          key: "dr5ru4ret9",
          doc_count: 1,
          center: {
            location: {
              x: -3.119999885559082,
              y: -3,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 4.328325271606445,
          },
        },
        {
          key: "dr5ru4rerq",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 5.157557487487793,
          },
        },
        {
          key: "dr5ru4rerm",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 5.599143028259277,
          },
        },
        {
          key: "dr5ru4rerd",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.808431148529053,
          },
        },
        {
          key: "dr5ru4rerc",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 8.695401191711426,
          },
        },
        {
          key: "dr5ru4rerb",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 9.130169868469238,
          },
        },
        {
          key: "dr5ru4rer9",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.259636878967285,
          },
        },
        {
          key: "dr5ru4rer7",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.971398830413818,
          },
        },
        {
          key: "dr5ru4rer4",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -7,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.1760993003845215,
          },
        },
        {
          key: "dr5ru4rer3",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 7.912041664123535,
          },
        },
        {
          key: "dr5ru4rer2",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.387514114379883,
          },
        },
        {
          key: "dr5ru4rer1",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -7.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 7.6646199226379395,
          },
        },
        {
          key: "dr5ru4rer0",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.154532432556152,
          },
        },
        {
          key: "dr5ru4reqx",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -4,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 4.011234283447266,
          },
        },
        {
          key: "dr5ru4reqn",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -4.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 4.667718887329102,
          },
        },
        {
          key: "dr5ru4reqg",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -6.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 6.531431674957275,
          },
        },
        {
          key: "dr5ru4reqb",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -8,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 8.025559425354004,
          },
        },
        {
          key: "dr5ru4repy",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -9.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.46947956085205,
          },
        },
        {
          key: "dr5ru4repv",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.925200462341309,
          },
        },
        {
          key: "dr5ru4repj",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.12405014038086,
          },
        },
        {
          key: "dr5ru4reph",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -10.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 10.618210792541504,
          },
        },
        {
          key: "dr5ru4repf",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -11.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.31300163269043,
          },
        },
        {
          key: "dr5ru4repd",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.488859176635742,
          },
        },
        {
          key: "dr5ru4repc",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.251791954040527,
          },
        },
        {
          key: "dr5ru4rep8",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.452568054199219,
          },
        },
        {
          key: "dr5ru4rep6",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -12,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 12.26174545288086,
          },
        },
        {
          key: "dr5ru4rep2",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.24199390411377,
          },
        },
        {
          key: "dr5ru4rep1",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -12.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.59946060180664,
          },
        },
        {
          key: "dr5ru4renz",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.022727012634277,
          },
        },
        {
          key: "dr5ru4renx",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -9,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 9.004998207092285,
          },
        },
        {
          key: "dr5ru4renv",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.020459175109863,
          },
        },
        {
          key: "dr5ru4rent",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -10,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 10.004499435424805,
          },
        },
        {
          key: "dr5ru4renf",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -12,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 12.017054557800293,
          },
        },
        {
          key: "dr5ru4rene",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -11,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 11.004090309143066,
          },
        },
        {
          key: "dr5ru4renb",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -13,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.01574420928955,
          },
        },
        {
          key: "dr5ru4rdzx",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.936341285705566,
          },
        },
        {
          key: "dr5ru4rdzs",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -15,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 15.393881797790527,
          },
        },
        {
          key: "dr5ru4rdzr",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -13.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 13.733185768127441,
          },
        },
        {
          key: "dr5ru4rdzq",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -14,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.224991798400879,
          },
        },
        {
          key: "dr5ru4rdzk",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -15.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 15.703516006469727,
          },
        },
        {
          key: "dr5ru4rdzj",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.58582878112793,
          },
        },
        {
          key: "dr5ru4rdzb",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -17.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.044666290283203,
          },
        },
        {
          key: "dr5ru4rdz5",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -16,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.077823638916016,
          },
        },
        {
          key: "dr5ru4rdz1",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -17,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.073265075683594,
          },
        },
        {
          key: "dr5ru4rdyy",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -14,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.014620780944824,
          },
        },
        {
          key: "dr5ru4rdyv",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 14.514117240905762,
          },
        },
        {
          key: "dr5ru4rdyj",
          doc_count: 1,
          center: {
            location: {
              x: -1.2400000095367432,
              y: -14.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 14.552924156188965,
          },
        },
        {
          key: "dr5ru4rdyd",
          doc_count: 1,
          center: {
            location: {
              x: -0.30000001192092896,
              y: -16.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 16.502727508544922,
          },
        },
        {
          key: "dr5ru4rdyc",
          doc_count: 1,
          center: {
            location: {
              x: 0.6399999856948853,
              y: -17,
            },
            count: 1,
          },
          total_pts: {
            value: 2,
          },
          avg_dist: {
            value: 17.012042999267578,
          },
        },
        {
          key: "dr5ru4rdxr",
          doc_count: 1,
          center: {
            location: {
              x: 2.5199999809265137,
              y: -18,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 18.17554473876953,
          },
        },
        {
          key: "dr5ru4rdxf",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -21.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 21.945613861083984,
          },
        },
        {
          key: "dr5ru4rdx9",
          doc_count: 1,
          center: {
            location: {
              x: 3.4600000381469727,
              y: -22,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 22.27042007446289,
          },
        },
        {
          key: "dr5ru4rdt8",
          doc_count: 1,
          center: {
            location: {
              x: -3.119999885559082,
              y: -22.5,
            },
            count: 1,
          },
          total_pts: {
            value: 3,
          },
          avg_dist: {
            value: 22.715290069580078,
          },
        },
        {
          key: "dr5ru4rdrz",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -23,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.41708755493164,
          },
        },
        {
          key: "dr5ru4rdry",
          doc_count: 1,
          center: {
            location: {
              x: 4.400000095367432,
              y: -23.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 23.908367156982422,
          },
        },
        {
          key: "dr5ru4rdrj",
          doc_count: 1,
          center: {
            location: {
              x: 1.5800000429153442,
              y: -24.5,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.550893783569336,
          },
        },
        {
          key: "dr5ru4rdmv",
          doc_count: 1,
          center: {
            location: {
              x: -2.180000066757202,
              y: -24,
            },
            count: 1,
          },
          total_pts: {
            value: 0,
          },
          avg_dist: {
            value: 24.098804473876953,
          },
        },
      ],
    },
  },
};
